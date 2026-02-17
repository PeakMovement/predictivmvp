import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Missing server credentials" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Get all auth users
    const { data: authData, error: authError } =
      await admin.auth.admin.listUsers({ perPage: 1000 });
    if (authError) throw authError;

    const authUsers = authData.users;

    // 2. Get all profiles in one query
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name");
    const profileMap = new Map(
      (profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name])
    );

    // 3. Get latest wearable session per user (device, last activity, readiness, sync time)
    // Use a single query ordered by date desc, then deduplicate in code
    const { data: sessions } = await admin
      .from("wearable_sessions")
      .select("user_id, source, date, readiness_score, fetched_at")
      .order("date", { ascending: false });

    const sessionMap = new Map<
      string,
      { source: string; date: string; readiness_score: number | null; fetched_at: string | null }
    >();
    for (const s of sessions || []) {
      if (!sessionMap.has(s.user_id)) {
        sessionMap.set(s.user_id, s);
      }
    }

    // 4. Get latest recovery trend per user (ACWR)
    const { data: trends } = await admin
      .from("recovery_trends")
      .select("user_id, acwr, recovery_score, period_date")
      .order("period_date", { ascending: false });

    const trendMap = new Map<
      string,
      { acwr: number | null; recovery_score: number | null }
    >();
    for (const t of trends || []) {
      if (!trendMap.has(t.user_id)) {
        trendMap.set(t.user_id, t);
      }
    }

    // 5. Check connected devices via token tables
    const { data: wearableTokenUsers } = await admin
      .from("wearable_tokens")
      .select("user_id");
    const fitbitUsers = new Set(
      (wearableTokenUsers || []).map((t: { user_id: string }) => t.user_id)
    );

    const { data: ouraTokenUsers } = await admin
      .from("oura_tokens")
      .select("user_id");
    const ouraUsers = new Set(
      (ouraTokenUsers || []).map((t: { user_id: string }) => t.user_id)
    );

    // 6. Assemble response
    const result = authUsers.map((u) => {
      const session = sessionMap.get(u.id);
      const trend = trendMap.get(u.id);

      // Determine device: prefer token tables, fallback to session source
      let device: string | null = null;
      if (ouraUsers.has(u.id)) device = "oura";
      else if (fitbitUsers.has(u.id)) device = "fitbit";
      else if (session?.source) device = session.source;

      return {
        user_id: u.id,
        email: u.email ?? null,
        full_name: profileMap.get(u.id) ?? null,
        device_connected: device,
        last_activity_date: session?.date ?? null,
        readiness_score: session?.readiness_score ?? null,
        risk_score_acwr: trend?.acwr ?? null,
        recovery_score: trend?.recovery_score ?? null,
        last_sync_time: session?.fetched_at ?? null,
      };
    });

    console.log(`[admin-user-overview] Returned ${result.length} users`);

    return new Response(JSON.stringify({ success: true, data: result, count: result.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[admin-user-overview] Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
