import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const jwtPayload = parseJwt(token);
    const userId = jwtPayload?.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Invalid JWT: unable to extract user_id" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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

    const exercisesData = await polarResponse.json();
    const exercises = exercisesData.exercises || [];

    let syncedCount = 0;

    for (const exercise of exercises) {
      try {
        const sessionData = mapPolarExerciseToSession(exercise, userId);

        const { error: upsertError } = await supabase
          .from("wearable_sessions")
          .upsert(sessionData, {
            onConflict: "user_id,start_time,source",
          });

        if (upsertError) {
          console.error("Error upserting exercise:", upsertError);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error("Error processing exercise:", error);
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

function parseJwt(token: string): { sub?: string } | null {
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

function mapPolarExerciseToSession(exercise: any, userId: string) {
  const startTime = exercise.start_time;
  const durationSeconds = exercise.duration ? parseDuration(exercise.duration) : 0;
  const calories = exercise.calories || null;
  const distanceMeters = exercise.distance || null;
  const avgHrBpm = exercise.heart_rate?.average || null;
  const maxHrBpm = exercise.heart_rate?.maximum || null;
  const trainingLoad = exercise.training_load || null;
  const sportType = exercise.detailed_sport_info || null;
  const deviceModel = exercise.device || null;

  return {
    user_id: userId,
    start_time: startTime,
    duration_seconds: durationSeconds,
    calories: calories,
    distance_meters: distanceMeters,
    avg_hr_bpm: avgHrBpm,
    max_hr_bpm: maxHrBpm,
    training_load: trainingLoad,
    sport_type: sportType,
    device_model: deviceModel,
    source: "polar",
    updated_at: new Date().toISOString(),
  };
}