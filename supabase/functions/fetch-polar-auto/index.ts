/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

// Item 7 — Polar Auto-Sync Pipeline
// Mirrors fetch-oura-auto / fetch-garmin-auto pattern.
// Finds all users in polar_tokens, calls fetch-polar-exercises + fetch-polar-sleep
// for each, logs results.
//
// Invocation:
//   POST /functions/v1/fetch-polar-auto
//   Body: {} — sync all Polar users
//   Body: { "user_id": "<uuid>" } — sync one user
//
// Triggered by: pg_cron (same schedule as Oura/Garmin)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    console.error("[fetch-polar-auto] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ error: "Server configuration error", success: false }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const targetUserId: string | undefined = body.user_id;

    // ── Resolve users to sync ────────────────────────────────────────
    let userIds: string[];
    if (targetUserId) {
      userIds = [targetUserId];
    } else {
      const { data: tokens, error } = await supabase
        .from("polar_tokens")
        .select("user_id");

      if (error) {
        console.error("[fetch-polar-auto] Failed to fetch polar_tokens:", error.message);
        return jsonResponse({ error: error.message, success: false }, 500);
      }

      userIds = (tokens || []).map((t: any) => t.user_id);
    }

    console.log(`[fetch-polar-auto] Syncing ${userIds.length} Polar users`);

    // ── Per-user sync ────────────────────────────────────────────────
    const results: any[] = [];

    for (const userId of userIds) {
      const userResult: { userId: string; exercises?: any; sleep?: any; error?: string } = { userId };

      try {
        // Generate a service-role JWT for the sub-functions (they require Bearer auth)
        const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: "noreply@internal",
        }).catch(() => ({ data: null, error: null }));

        // Use service role key as Bearer — the sub-functions parse JWT sub,
        // so we pass userId in the body instead for service-role calls.
        const headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceKey}`,
          "x-polar-user-id-override": userId, // sub-functions check this header
        };

        // Sync exercises
        const exerciseResp = await fetch(`${supabaseUrl}/functions/v1/fetch-polar-exercises`, {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: userId }),
        });
        userResult.exercises = await exerciseResp.json().catch(() => ({ status: exerciseResp.status }));

        // Sync sleep
        const sleepResp = await fetch(`${supabaseUrl}/functions/v1/fetch-polar-sleep`, {
          method: "POST",
          headers,
          body: JSON.stringify({ user_id: userId }),
        });
        userResult.sleep = await sleepResp.json().catch(() => ({ status: sleepResp.status }));

        // Log success
        await supabase.from("polar_logs").insert({
          user_id: userId,
          event_type: "auto_sync",
          status: "success",
          details: { exercises: userResult.exercises, sleep: userResult.sleep },
        }).catch(() => null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[fetch-polar-auto] Error for user ${userId}:`, msg);
        userResult.error = msg;

        await supabase.from("polar_logs").insert({
          user_id: userId,
          event_type: "auto_sync",
          status: "error",
          details: { error: msg },
        }).catch(() => null);
      }

      results.push(userResult);
    }

    const duration = Date.now() - startTime;
    console.log(`[fetch-polar-auto] Done in ${duration}ms. ${results.length} users processed.`);

    return jsonResponse({
      success: true,
      trigger: "scheduled",
      duration_ms: duration,
      users_processed: results.length,
      results,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[fetch-polar-auto] Fatal error:", msg);
    return jsonResponse({ error: msg, success: false }, 500);
  }
});

function jsonResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
