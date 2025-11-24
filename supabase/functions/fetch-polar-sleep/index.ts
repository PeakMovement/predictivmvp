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
      "https://www.polaraccesslink.com/v3/users/sleep",
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
        event_type: "fetch_sleep",
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
        event_type: "fetch_sleep",
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
        JSON.stringify({ success: true, synced: 0, sleep: [] }),
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
        event_type: "fetch_sleep",
        status: "error",
        details: { status: polarResponse.status, error: errorText },
      });

      return new Response(
        JSON.stringify({ error: "network_error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sleepData = await polarResponse.json();
    const sleepNights = sleepData.nights || [];

    let syncedCount = 0;

    for (const night of sleepNights) {
      try {
        const sessionData = mapPolarSleepToSession(night, userId);

        const { error: upsertError } = await supabase
          .from("wearable_sessions")
          .upsert(sessionData, {
            onConflict: "user_id,start_time,source",
          });

        if (upsertError) {
          console.error("Error upserting sleep session:", upsertError);
        } else {
          syncedCount++;
        }
      } catch (error) {
        console.error("Error processing sleep session:", error);
      }
    }

    await supabase.from("polar_logs").insert({
      user_id: userId,
      event_type: "fetch_sleep",
      status: "success",
      data_type: "sleep",
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
    console.error("Error in fetch-polar-sleep:", error);
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

function mapPolarSleepToSession(night: any, userId: string) {
  const startTime = night.sleep_start_time;
  const endTime = night.sleep_end_time;
  const sleepScore = night.sleep_score || null;
  const continuityScore = night.continuity || null;

  const lightSleep = night.light_sleep || 0;
  const deepSleep = night.deep_sleep || 0;
  const remSleep = night.rem_sleep || 0;

  const durationSeconds = lightSleep + deepSleep + remSleep;

  const sleepStages = {
    light: lightSleep,
    deep: deepSleep,
    rem: remSleep,
  };

  const date = startTime ? new Date(startTime).toISOString().split('T')[0] : null;

  return {
    user_id: userId,
    start_time: startTime,
    end_time: endTime,
    date: date,
    duration_seconds: durationSeconds,
    sleep_score: sleepScore,
    sleep_continuity_score: continuityScore,
    sleep_stages: sleepStages,
    light_sleep_duration: lightSleep,
    deep_sleep_duration: deepSleep,
    rem_sleep_duration: remSleep,
    total_sleep_duration: durationSeconds,
    source: "polar",
    updated_at: new Date().toISOString(),
  };
}