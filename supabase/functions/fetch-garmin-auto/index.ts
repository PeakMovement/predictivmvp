/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// Scheduled auto-sync wrapper for Garmin data.
// Mirrors the fetch-oura-auto pattern: finds all Garmin-connected users,
// calls fetch-garmin-data for each, and logs results.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[fetch-garmin-auto] [START] Triggering Garmin data sync");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("[fetch-garmin-auto] [ERROR] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server configuration error", success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call the main fetch-garmin-data function (no user_id = process all users)
    const response = await fetch(`${supabaseUrl}/functions/v1/fetch-garmin-data`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    console.log(
      `[fetch-garmin-auto] [COMPLETE] Status=${response.status} in ${Date.now() - startTime}ms: ${JSON.stringify(result).substring(0, 500)}`,
    );

    return new Response(
      JSON.stringify({
        success: response.ok,
        trigger: "scheduled",
        duration_ms: Date.now() - startTime,
        ...result,
      }),
      { status: response.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[fetch-garmin-auto] [FATAL] ${msg}`);
    return new Response(
      JSON.stringify({ error: msg, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
