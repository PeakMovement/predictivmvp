import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Resolve userId: service-role override > body > JWT sub
    let userId: string | undefined;

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") ?? "";
    const jwtPayload = parseJwt(token);
    const isServiceRole = jwtPayload?.role === "service_role";

    // 1. Service-role auto-sync header
    const overrideHeader = req.headers.get("x-polar-user-id-override");
    if (overrideHeader && isServiceRole) {
      userId = overrideHeader;
    }

    // 2. Body user_id (service-role call)
    if (!userId) {
      const body = await req.clone().json().catch(() => ({}));
      if (body.user_id && isServiceRole) {
        userId = body.user_id;
      }
    }

    // 3. Standard user JWT
    if (!userId) {
      userId = jwtPayload?.sub;
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid JWT: unable to extract user_id" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: tokenData, error: tokenError } = await supabase
      .from("polar_tokens")
      .select("access_token")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error("No Polar token found for user:", userId);
      return new Response(
        JSON.stringify({ error: "Polar device not connected" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = tokenData.access_token;

    const polarResponse = await fetch(
      "https://www.polaraccesslink.com/v3/exercises?samples=true&zones=true&route=false",
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (polarResponse.status === 403) {
      await supabase.from("polar_logs").insert({
        user_id: userId,
        event_type: "fetch_exercises",
        status: "error",
        details: { error: "consent_required" },
      });

      return new Response(
        JSON.stringify({ error: "consent_required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (polarResponse.status === 401) {
      await supabase.from("polar_logs").insert({
        user_id: userId,
        event_type: "fetch_exercises",
        status: "error",
        details: { error: "invalid_or_revoked_token" },
      });

      return new Response(
        JSON.stringify({ error: "invalid_or_revoked_token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (polarResponse.status === 404) {
      return new Response(
        JSON.stringify({ success: true, synced: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!polarResponse.ok) {
      const errorText = await polarResponse.text();
      console.error("Polar API error:", polarResponse.status, errorText);

      await supabase.from("polar_logs").insert({
        user_id: userId,
        event_type: "fetch_exercises",
        status: "error",
        details: { status: polarResponse.status, error: errorText },
      });

      return new Response(
        JSON.stringify({ error: "Failed to fetch exercises from Polar" }),
        {
          status: polarResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Polar API returns a bare array: [{...}, {...}]. Some responses wrap it
    // as {exercises: [...]} for backwards compat — handle both shapes.
    const exercisesData = await polarResponse.json();
    const exercises = Array.isArray(exercisesData)
      ? exercisesData
      : (exercisesData.exercises || []);

    let syncedCount = 0;

    // Aggregate multiple exercises on the same day — wearable_sessions and
    // training_trends both key on (user_id, source, date), so we sum loads
    // and take the most intense session's heart-rate values per day.
    const byDate = new Map<string, any[]>();
    for (const exercise of exercises) {
      const date = (exercise.start_time || "").slice(0, 10);
      if (!date) continue;
      const arr = byDate.get(date) || [];
      arr.push(exercise);
      byDate.set(date, arr);
    }

    // Precompute per-date load totals so we can derive monotony / strain /
    // ACWR using the same 7d-acute / 28d-chronic windows Garmin uses.
    const loadByDate = new Map<string, number>();
    for (const [date, dayExercises] of byDate) {
      const dayLoad = dayExercises.reduce(
        (sum, e) => sum + (e.training_load_pro?.["cardio-load"] ?? 0),
        0,
      );
      loadByDate.set(date, dayLoad);
    }
    const sortedTrendDates = Array.from(loadByDate.keys()).sort();

    const computeTrends = (targetDate: string) => {
      const pastDates = sortedTrendDates.filter((d) => d <= targetDate);
      const last7 = pastDates.slice(-7).map((d) => loadByDate.get(d) || 0);
      const last28 = pastDates.slice(-28).map((d) => loadByDate.get(d) || 0);

      const acuteLoad = last7.length > 0
        ? last7.reduce((a, b) => a + b, 0) / last7.length
        : 0;
      const chronicLoad = last28.length >= 7
        ? last28.reduce((a, b) => a + b, 0) / last28.length
        : null;
      const acwr = chronicLoad && chronicLoad > 0
        ? Math.round((acuteLoad / chronicLoad) * 100) / 100
        : null;

      const weeklyLoad = last7.reduce((a, b) => a + b, 0);

      // Monotony = mean(7d) / stddev(7d), capped at 2.5 to match calculate-oura-trends.
      const variance = last7.length > 0
        ? last7.reduce((s, v) => s + Math.pow(v - acuteLoad, 2), 0) / last7.length
        : 0;
      const std = Math.sqrt(variance);
      const rawMonotony = std > 0 ? acuteLoad / std : 0;
      const monotony = Math.min(rawMonotony, 2.5);

      // Strain = (weekly load × capped monotony) / 7 (same formula Oura uses).
      const strain = monotony && weeklyLoad ? (weeklyLoad * monotony) / 7 : 0;

      return {
        acute_load: Math.round(acuteLoad * 100) / 100,
        chronic_load: chronicLoad ? Math.round(chronicLoad * 100) / 100 : null,
        acwr,
        strain: Math.round(strain * 100) / 100,
        monotony: Math.round(monotony * 100) / 100,
      };
    };

    for (const [date, dayExercises] of byDate) {
      try {
        // Pick the longest exercise of the day as the "primary" for HR stats,
        // but aggregate totals across all sessions on that date.
        const primary = dayExercises.reduce((a, b) => {
          const aDur = a.duration ? parseDuration(a.duration) : 0;
          const bDur = b.duration ? parseDuration(b.duration) : 0;
          return bDur > aDur ? b : a;
        }, dayExercises[0]);

        const totalDurationSec = dayExercises.reduce(
          (sum, e) => sum + (e.duration ? parseDuration(e.duration) : 0),
          0,
        );
        const totalCalories = dayExercises.reduce(
          (sum, e) => sum + (e.calories || 0),
          0,
        );
        const totalDistanceKm = dayExercises.reduce(
          (sum, e) => sum + (e.distance ? e.distance / 1000 : 0),
          0,
        );
        const totalLoad = dayExercises.reduce(
          (sum, e) => sum + (e.training_load_pro?.["cardio-load"] ?? 0),
          0,
        );

        const sessionData = {
          user_id: userId,
          date: date,
          source: "polar",
          duration_minutes: Math.round(totalDurationSec / 60) || null,
          active_calories: totalCalories || null,
          total_distance_km: totalDistanceKm ? Math.round(totalDistanceKm * 100) / 100 : null,
          avg_heart_rate: primary.heart_rate?.average ?? null,
          max_heart_rate: primary.heart_rate?.maximum ?? null,
          training_load: totalLoad || null,
          session_type: primary.detailed_sport_info ?? primary.sport ?? null,
          fetched_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from("wearable_sessions")
          .upsert(sessionData, { onConflict: "user_id,source,date" });

        if (upsertError) {
          console.error(`Error upserting exercise ${date}:`, upsertError);
          continue;
        }

        // Mirror to training_trends so Recent Sessions + training UI pick up
        // Polar workouts. Includes monotony / strain / ACWR so the Load panel
        // displays real values, matching the Oura and Garmin pattern.
        const trends = computeTrends(date);
        const { error: trendError } = await supabase
          .from("training_trends")
          .upsert({
            user_id: userId,
            date: date,
            source: "polar",
            training_load: totalLoad || null,
            acute_load: trends.acute_load,
            chronic_load: trends.chronic_load,
            acwr: trends.acwr,
            strain: trends.strain,
            monotony: trends.monotony,
            hrv: null,
            sleep_score: null,
          }, { onConflict: "user_id,source,date" });

        if (trendError) {
          console.error(`Error upserting trend ${date}:`, trendError);
        }

        syncedCount += dayExercises.length;
      } catch (error) {
        console.error(`Error processing exercises for ${date}:`, error);
      }
    }

    await supabase.from("polar_logs").insert({
      user_id: userId,
      event_type: "fetch_exercises",
      status: "success",
      data_type: "exercise",
      details: { entries_synced: syncedCount },
    });

    return new Response(
      JSON.stringify({ success: true, synced: syncedCount }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fetch-polar-exercises:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function parseJwt(token: string): { sub?: string; role?: string } | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error parsing JWT:", error);
    return null;
  }
}

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

