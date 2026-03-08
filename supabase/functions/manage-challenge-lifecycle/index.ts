import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Maps challenge_type to how we query wearable_sessions
const METRIC_MAP: Record<string, { column: string; aggregation: "count" | "sum" | "avg" }> = {
  workout_frequency: { column: "*", aggregation: "count" },
  distance_goal: { column: "total_distance", aggregation: "sum" },
  sleep_target: { column: "sleep_score", aggregation: "avg" },
  recovery_focus: { column: "readiness", aggregation: "avg" },
  hrv_improvement: { column: "hrv", aggregation: "avg" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date();
    const results = {
      expired_pending: 0,
      expired_overdue: 0,
      progress_updated: 0,
      auto_completed: 0,
    };

    // 1. Auto-expire pending challenges older than 3 days
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000).toISOString();
    const { data: expiredPending, error: expErr } = await supabase
      .from("user_challenges")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", threeDaysAgo)
      .select("id");

    if (expErr) console.error("[manage-challenge-lifecycle] Expire pending error:", expErr);
    results.expired_pending = expiredPending?.length || 0;

    // 2. Expire active challenges past their expires_at
    const { data: expiredOverdue, error: overdueErr } = await supabase
      .from("user_challenges")
      .update({ status: "expired" })
      .eq("status", "active")
      .lt("expires_at", now.toISOString())
      .not("expires_at", "is", null)
      .select("id");

    if (overdueErr) console.error("[manage-challenge-lifecycle] Expire overdue error:", overdueErr);
    results.expired_overdue = expiredOverdue?.length || 0;

    // 3. Sync progress for active challenges
    const { data: activeChallenges, error: activeErr } = await supabase
      .from("user_challenges")
      .select("id, user_id, challenge_type, target_value, week_start_date, current_progress")
      .eq("status", "active");

    if (activeErr) {
      console.error("[manage-challenge-lifecycle] Fetch active error:", activeErr);
    }

    for (const challenge of activeChallenges || []) {
      try {
        const metric = METRIC_MAP[challenge.challenge_type];
        if (!metric) continue;

        // Calculate the week end date
        const weekStart = challenge.week_start_date;
        const weekEndDate = new Date(weekStart);
        weekEndDate.setDate(weekEndDate.getDate() + 7);
        const weekEnd = weekEndDate.toISOString().split("T")[0];

        // Query wearable_sessions for this user's week
        const { data: sessions } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", challenge.user_id)
          .gte("date", weekStart)
          .lt("date", weekEnd);

        if (!sessions || sessions.length === 0) continue;

        let newProgress = 0;

        if (metric.aggregation === "count") {
          newProgress = sessions.length;
        } else if (metric.aggregation === "sum") {
          newProgress = sessions.reduce((sum: number, s: any) => {
            const val = s[metric.column];
            return sum + (typeof val === "number" ? val : 0);
          }, 0);
        } else if (metric.aggregation === "avg") {
          const values = sessions
            .map((s: any) => s[metric.column])
            .filter((v: any) => typeof v === "number" && !isNaN(v));
          newProgress = values.length > 0
            ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length)
            : 0;
        }

        // Round distance to sensible units (meters → km if > 1000)
        if (challenge.challenge_type === "distance_goal" && newProgress > 1000) {
          newProgress = Math.round(newProgress / 100) / 10; // to km with 1 decimal
        }

        // Only update if progress changed
        if (newProgress !== challenge.current_progress) {
          const updates: any = { current_progress: newProgress };

          // Auto-complete if target met
          if (challenge.target_value && newProgress >= challenge.target_value) {
            updates.status = "completed";
            updates.completed_at = now.toISOString();
            results.auto_completed++;
          }

          await supabase
            .from("user_challenges")
            .update(updates)
            .eq("id", challenge.id);

          results.progress_updated++;
        }
      } catch (err) {
        console.error(`[manage-challenge-lifecycle] Progress sync error for challenge ${challenge.id}:`, err);
      }
    }

    console.log("[manage-challenge-lifecycle] SUCCESS:", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[manage-challenge-lifecycle] Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
