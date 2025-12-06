import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WearableSession {
  date: string;
  sleep_score: number | null;
  readiness_score: number | null;
  hrv_avg: number | null;
  resting_hr: number | null;
  activity_score: number | null;
  total_steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
}

function safeNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value)) return null;
  return value;
}

function calculateAverage(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function calculateStdDev(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length < 2) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / valid.length;
  return Math.sqrt(variance);
}

function determineTrendDirection(current: number | null, baseline: number | null): string {
  if (current === null || baseline === null) return "stable";
  const delta = current - baseline;
  const threshold = Math.abs(baseline) * 0.05; // 5% threshold
  if (delta > threshold) return "increasing";
  if (delta < -threshold) return "declining";
  return "stable";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { user_id } = await req.json().catch(() => ({}));

    // Get all users with Oura tokens if no specific user provided
    let userIds: string[] = [];
    if (user_id) {
      userIds = [user_id];
    } else {
      const { data: tokens } = await supabase
        .from("oura_tokens")
        .select("user_id");
      userIds = tokens?.map((t) => t.user_id).filter(Boolean) || [];
    }

    console.log(`[calculate-oura-trends] [INFO] Processing ${userIds.length} users`);

    const results: { userId: string; status: string; error?: string }[] = [];

    for (const userId of userIds) {
      try {
        // Fetch last 60 days of wearable sessions for trend calculations
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const { data: sessions, error: sessionsError } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", userId)
          .gte("date", sixtyDaysAgo.toISOString().split("T")[0])
          .order("date", { ascending: true });

        if (sessionsError) {
          console.error(`[calculate-oura-trends] [ERROR] Failed to fetch sessions for ${userId}:`, sessionsError);
          results.push({ userId, status: "error", error: sessionsError.message });
          continue;
        }

        if (!sessions || sessions.length < 4) {
          console.log(`[calculate-oura-trends] [INFO] Not enough data for ${userId} (${sessions?.length || 0} days, need at least 4)`);
          results.push({ userId, status: "skipped", error: "Need at least 4 days of data" });
          continue;
        }

        // Warn if limited data (less than 14 days for full baseline comparison)
        const hasLimitedData = sessions.length < 14;
        if (hasLimitedData) {
          console.log(`[calculate-oura-trends] [INFO] Limited data for ${userId} (${sessions.length} days), using available baseline`);
        }

        const typedSessions = sessions as WearableSession[];
        const today = new Date().toISOString().split("T")[0];

        // === DAILY TRENDS ===
        // Use available data, adapting to what exists
        const dataLength = typedSessions.length;
        const recentDays = Math.min(7, Math.ceil(dataLength / 2)); // Use up to 7 days or half of available data
        const last7Days = typedSessions.slice(-recentDays);
        const prev7Days = typedSessions.slice(0, -recentDays);

        const dailyTrends: Array<{
          user_id: string;
          period_date: string;
          metric_name: string;
          value: number | null;
          baseline: number | null;
          delta: number | null;
          trend_direction: string;
        }> = [];

        // Sleep trend
        const sleepCurrent = calculateAverage(last7Days.map((s) => s.sleep_score));
        const sleepBaseline = calculateAverage(prev7Days.map((s) => s.sleep_score));
        dailyTrends.push({
          user_id: userId,
          period_date: today,
          metric_name: "sleep_score",
          value: safeNumber(sleepCurrent),
          baseline: safeNumber(sleepBaseline),
          delta: sleepCurrent !== null && sleepBaseline !== null ? safeNumber(sleepCurrent - sleepBaseline) : null,
          trend_direction: determineTrendDirection(sleepCurrent, sleepBaseline),
        });

        // Readiness trend
        const readinessCurrent = calculateAverage(last7Days.map((s) => s.readiness_score));
        const readinessBaseline = calculateAverage(prev7Days.map((s) => s.readiness_score));
        dailyTrends.push({
          user_id: userId,
          period_date: today,
          metric_name: "readiness_score",
          value: safeNumber(readinessCurrent),
          baseline: safeNumber(readinessBaseline),
          delta: readinessCurrent !== null && readinessBaseline !== null ? safeNumber(readinessCurrent - readinessBaseline) : null,
          trend_direction: determineTrendDirection(readinessCurrent, readinessBaseline),
        });

        // HRV trend
        const hrvCurrent = calculateAverage(last7Days.map((s) => s.hrv_avg));
        const hrvBaseline = calculateAverage(prev7Days.map((s) => s.hrv_avg));
        dailyTrends.push({
          user_id: userId,
          period_date: today,
          metric_name: "hrv",
          value: safeNumber(hrvCurrent),
          baseline: safeNumber(hrvBaseline),
          delta: hrvCurrent !== null && hrvBaseline !== null ? safeNumber(hrvCurrent - hrvBaseline) : null,
          trend_direction: determineTrendDirection(hrvCurrent, hrvBaseline),
        });

        // Resting HR trend (lower is better, so invert trend direction)
        const rhrCurrent = calculateAverage(last7Days.map((s) => s.resting_hr));
        const rhrBaseline = calculateAverage(prev7Days.map((s) => s.resting_hr));
        const rhrTrend = determineTrendDirection(rhrCurrent, rhrBaseline);
        dailyTrends.push({
          user_id: userId,
          period_date: today,
          metric_name: "resting_hr",
          value: safeNumber(rhrCurrent),
          baseline: safeNumber(rhrBaseline),
          delta: rhrCurrent !== null && rhrBaseline !== null ? safeNumber(rhrCurrent - rhrBaseline) : null,
          trend_direction: rhrTrend === "increasing" ? "declining" : rhrTrend === "declining" ? "increasing" : "stable",
        });

        // Upsert daily trends
        for (const trend of dailyTrends) {
          const { error: upsertError } = await supabase
            .from("health_trends_daily")
            .upsert(trend, { onConflict: "user_id,period_date,metric_name" });

          if (upsertError) {
            console.error(`[calculate-oura-trends] [ERROR] Failed to upsert daily trend:`, upsertError);
          }
        }

        // === WEEKLY TRENDS ===
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        const prevWeekEnd = new Date(weekStart);
        prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);

        const currentWeekSessions = typedSessions.filter((s) => {
          const d = new Date(s.date);
          return d >= weekStart && d <= weekEnd;
        });

        const prevWeekSessions = typedSessions.filter((s) => {
          const d = new Date(s.date);
          return d >= prevWeekStart && d <= prevWeekEnd;
        });

        const weeklyMetrics = ["sleep_score", "readiness_score", "hrv", "activity_score"] as const;
        const metricMap: Record<string, keyof WearableSession> = {
          sleep_score: "sleep_score",
          readiness_score: "readiness_score",
          hrv: "hrv_avg",
          activity_score: "activity_score",
        };

        for (const metric of weeklyMetrics) {
          const field = metricMap[metric];
          const currentAvg = calculateAverage(currentWeekSessions.map((s) => s[field] as number | null));
          const prevAvg = calculateAverage(prevWeekSessions.map((s) => s[field] as number | null));
          const weekOverWeek = prevAvg && prevAvg !== 0 ? ((currentAvg || 0) - prevAvg) / prevAvg * 100 : null;

          const { error: weeklyError } = await supabase
            .from("health_trends_weekly")
            .upsert({
              user_id: userId,
              period_start: weekStart.toISOString().split("T")[0],
              period_end: weekEnd.toISOString().split("T")[0],
              metric_name: metric,
              value: safeNumber(currentAvg),
              baseline: safeNumber(prevAvg),
              delta: currentAvg !== null && prevAvg !== null ? safeNumber(currentAvg - prevAvg) : null,
              week_over_week_pct: safeNumber(weekOverWeek),
              trend_direction: determineTrendDirection(currentAvg, prevAvg),
            }, { onConflict: "user_id,period_start,metric_name" });

          if (weeklyError) {
            console.error(`[calculate-oura-trends] [ERROR] Failed to upsert weekly trend:`, weeklyError);
          }
        }

        // === RECOVERY & LOAD TRENDS ===
        const last28Days = typedSessions.slice(-28);
        const acuteData = last7Days.map((s) => s.activity_score || 0);
        const chronicData = last28Days.map((s) => s.activity_score || 0);

        // Calculate daily averages for ACWR
        const acuteLoadAvg = calculateAverage(acuteData);
        const chronicLoadAvg = calculateAverage(chronicData);
        const acwr = chronicLoadAvg && chronicLoadAvg !== 0 ? (acuteLoadAvg || 0) / chronicLoadAvg : null;

        // Calculate weekly load (sum of 7 days) for monotony & strain
        const weeklyLoad = acuteData.reduce((sum, v) => sum + v, 0);
        const meanDailyLoad = weeklyLoad / (acuteData.length || 1);
        
        // Monotony = Mean Daily Load ÷ Standard Deviation of Daily Load
        const monotonyStdDev = calculateStdDev(acuteData);
        const monotony = monotonyStdDev && monotonyStdDev > 0 ? meanDailyLoad / monotonyStdDev : null;

        // Strain = Weekly Load × Monotony
        const strain = monotony && weeklyLoad ? weeklyLoad * monotony : null;

        // Determine ACWR trend
        const prev7DaysAcute = calculateAverage(prev7Days.map((s) => s.activity_score || 0));
        const prev28Days = typedSessions.slice(-35, -7);
        const prevChronicLoad = calculateAverage(prev28Days.map((s) => s.activity_score || 0));
        const prevAcwr = prevChronicLoad && prevChronicLoad !== 0 ? (prev7DaysAcute || 0) / prevChronicLoad : null;
        const acwrTrend = determineTrendDirection(acwr, prevAcwr);

        const { error: recoveryError } = await supabase
          .from("recovery_trends")
          .upsert({
            user_id: userId,
            period_date: today,
            chronic_load: safeNumber(chronicLoadAvg),
            acute_load: safeNumber(acuteLoadAvg),
            acwr: safeNumber(acwr),
            acwr_trend: acwrTrend,
            monotony: safeNumber(monotony),
            strain: safeNumber(strain),
            recovery_score: safeNumber(readinessCurrent),
          }, { onConflict: "user_id,period_date" });

        if (recoveryError) {
          console.error(`[calculate-oura-trends] [ERROR] Failed to upsert recovery trend:`, recoveryError);
        }

        // === TRAINING TRENDS (for graphs) ===
        // Also upsert to training_trends for the UnifiedTrendCard graphs
        const { error: trainingError } = await supabase
          .from("training_trends")
          .upsert({
            user_id: userId,
            date: today,
            acwr: safeNumber(acwr),
            ewma: safeNumber(acuteLoadAvg), // EWMA approximated by acute load average
            strain: safeNumber(strain),
            monotony: safeNumber(monotony),
            hrv: safeNumber(hrvCurrent),
            sleep_score: safeNumber(sleepCurrent),
            training_load: safeNumber(weeklyLoad),
            acute_load: safeNumber(acuteLoadAvg),
            chronic_load: safeNumber(chronicLoadAvg),
          }, { onConflict: "user_id,date" });

        if (trainingError) {
          console.error(`[calculate-oura-trends] [ERROR] Failed to upsert training trend:`, trainingError);
        }

        // === ACTIVITY TRENDS ===
        const stepsAvg7d = calculateAverage(last7Days.map((s) => s.total_steps));
        const stepsBaseline = calculateAverage(prev7Days.map((s) => s.total_steps));
        const caloriesAvg7d = calculateAverage(last7Days.map((s) => s.total_calories));
        const caloriesBaseline = calculateAverage(prev7Days.map((s) => s.total_calories));
        const activityScoreAvg = calculateAverage(last7Days.map((s) => s.activity_score));

        const { error: activityError } = await supabase
          .from("activity_trends")
          .upsert({
            user_id: userId,
            period_date: today,
            steps_avg_7d: safeNumber(stepsAvg7d),
            steps_baseline: safeNumber(stepsBaseline),
            steps_delta: stepsAvg7d !== null && stepsBaseline !== null ? safeNumber(stepsAvg7d - stepsBaseline) : null,
            calories_avg_7d: safeNumber(caloriesAvg7d),
            calories_baseline: safeNumber(caloriesBaseline),
            calories_delta: caloriesAvg7d !== null && caloriesBaseline !== null ? safeNumber(caloriesAvg7d - caloriesBaseline) : null,
            activity_score_avg: safeNumber(activityScoreAvg),
            trend_direction: determineTrendDirection(stepsAvg7d, stepsBaseline),
          }, { onConflict: "user_id,period_date" });

        if (activityError) {
          console.error(`[calculate-oura-trends] [ERROR] Failed to upsert activity trend:`, activityError);
        }

        console.log(`[calculate-oura-trends] [SUCCESS] Trends calculated for user ${userId}`);
        
        // Trigger recommendation regeneration with fresh data
        try {
          const { error: recsError } = await supabase.functions.invoke('generate-yves-recommendations', {
            body: { userId }
          });
          if (recsError) {
            console.error(`[calculate-oura-trends] [WARN] Failed to regenerate recommendations:`, recsError);
          } else {
            console.log(`[calculate-oura-trends] [SUCCESS] Recommendations regenerated for user ${userId}`);
          }
        } catch (recsErr) {
          console.error(`[calculate-oura-trends] [WARN] Recommendations trigger failed:`, recsErr);
        }
        
        results.push({ userId, status: "success" });

      } catch (userError) {
        console.error(`[calculate-oura-trends] [ERROR] Failed for user ${userId}:`, userError);
        results.push({ userId, status: "error", error: String(userError) });
      }
    }

    console.log(`[calculate-oura-trends] [SUCCESS] Completed trend calculation for ${results.filter(r => r.status === "success").length}/${userIds.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("[calculate-oura-trends] [ERROR] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});