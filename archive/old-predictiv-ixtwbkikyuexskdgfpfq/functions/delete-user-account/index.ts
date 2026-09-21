import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// All user-scoped tables and their user FK column.
// Ordered so child-before-parent deletions avoid FK violations where cascades aren't set.
const USER_TABLES: Array<{ table: string; col: string }> = [
  // Wearable data
  { table: "wearable_sessions",          col: "user_id" },
  { table: "wearable_summary",           col: "user_id" },
  { table: "oura_sleep",                 col: "user_id" },
  { table: "oura_readiness",             col: "user_id" },
  { table: "oura_activity",              col: "user_id" },
  { table: "oura_stress",                col: "user_id" },
  { table: "oura_resilience",            col: "user_id" },
  { table: "oura_spo2",                  col: "user_id" },
  { table: "oura_vo2max",                col: "user_id" },
  { table: "oura_cardiovascular_age",    col: "user_id" },
  { table: "oura_rest_mode",             col: "user_id" },
  { table: "oura_workout",               col: "user_id" },
  { table: "oura_ring_config",           col: "user_id" },
  { table: "oura_tokens",                col: "user_id" },
  { table: "polar_tokens",               col: "user_id" },
  { table: "polar_logs",                 col: "user_id" },
  { table: "garmin_oauth_state",         col: "user_id" },
  { table: "google_calendar_tokens",     col: "user_id" },
  { table: "google_calendar_events",     col: "user_id" },
  // AI / insights
  { table: "yves_memory_bank",           col: "user_id" },
  { table: "yves_recommendations",       col: "user_id" },
  { table: "daily_briefings",            col: "user_id" },
  { table: "insight_history",            col: "user_id" },
  { table: "user_context",              col: "user_id" },
  { table: "user_context_enhanced",      col: "user_id" },
  { table: "prompt_history",             col: "user_id" },
  { table: "user_adaptation_profile",    col: "user_id" },
  { table: "recommendation_outcomes",    col: "user_id" },
  { table: "engagement_events",          col: "user_id" },
  // Health / analytics
  { table: "health_anomalies",           col: "user_id" },
  { table: "training_trends",            col: "user_id" },
  { table: "recovery_trends",            col: "user_id" },
  { table: "activity_trends",            col: "user_id" },
  { table: "user_baselines",             col: "user_id" },
  { table: "user_deviations",            col: "user_id" },
  { table: "user_data_maturity",         col: "user_id" },
  { table: "risk_trajectories",          col: "user_id" },
  { table: "alert_settings",             col: "user_id" },
  { table: "alert_history",              col: "user_id" },
  { table: "symptom_check_ins",          col: "user_id" },
  { table: "triage_results",             col: "user_id" },
  // Profile / lifestyle tables
  { table: "user_injuries",             col: "user_id" },
  { table: "user_injury_profiles",       col: "user_id" },
  { table: "user_lifestyle",             col: "user_id" },
  { table: "user_interests",             col: "user_id" },
  { table: "user_nutrition",             col: "user_id" },
  { table: "user_training",              col: "user_id" },
  { table: "user_medical",               col: "user_id" },
  { table: "user_wellness_goals",        col: "user_id" },
  { table: "user_recovery",              col: "user_id" },
  { table: "user_mindset",               col: "user_id" },
  { table: "user_focus_preferences",     col: "user_id" },
  { table: "user_health_profiles",       col: "user_id" },
  // Documents (delete log before documents to respect FK)
  { table: "document_processing_log",    col: "user_id" },
  { table: "user_documents",             col: "user_id" },
  // Practitioner
  { table: "practitioner_access",        col: "patient_id" },
  { table: "practitioner_access",        col: "practitioner_id" },
  // Social / challenges
  { table: "user_challenges",            col: "user_id" },
  { table: "weekly_reflections",         col: "user_id" },
  { table: "notification_log",           col: "user_id" },
  { table: "user_roles",                 col: "user_id" },
  { table: "user_shown_patterns",        col: "user_id" },
  { table: "user_treatment_preferences", col: "user_id" },
  { table: "treatment_plan_feedback",    col: "user_id" },
  // Finally the main profile (referenced by many, but with ON DELETE SET NULL or CASCADE)
  { table: "user_profiles",              col: "user_id" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Authenticate the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = user.id;
    const errors: string[] = [];

    // Delete user data from every table (best-effort — log non-fatal errors)
    for (const { table, col } of USER_TABLES) {
      const { error } = await supabase.from(table as any).delete().eq(col, uid);
      if (error && !error.message.includes("does not exist")) {
        // Table might not exist in all envs — skip silently
        errors.push(`${table}.${col}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      console.warn("Non-fatal delete errors:", errors);
    }

    // Delete the auth user — this is the point of no return
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(uid);
    if (deleteAuthError) {
      throw new Error(`Failed to delete auth user: ${deleteAuthError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-user-account error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Delete failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
