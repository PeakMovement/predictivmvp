import { createClient } from "npm:@supabase/supabase-js@2";

// M2 Sub-task 6 — Weekly Pattern Analysis
// Runs weekly (or on-demand). Reads wearable_sessions + baseline_profiles,
// detects patterns, writes to user_model with device_source tagging.
//
// Patterns detected:
//   - sleep_pattern_weekday / sleep_pattern_weekend (avg sleep score by day type)
//   - hrv_trend (improving / stable / declining over 14 days)
//   - load_pattern (weekly load consistency / progression)
//   - recovery_pattern (typical recovery time after high load)
//   - rhr_trend (resting HR trend)
//   - training_consistency (days active per week)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json().catch(() => ({}));
    const { user_id } = body;

    let userIds: string[] = [];
    if (user_id) {
      userIds = [user_id];
    } else {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const { data } = await supabase
        .from("wearable_sessions")
        .select("user_id")
        .gte("date", fourteenDaysAgo.toISOString().split("T")[0]);
      userIds = [...new Set((data || []).map((r: any) => r.user_id))];
    }

    console.log(`[analyze-user-patterns] Processing ${userIds.length} users`);
    const results: any[] = [];

    for (const userId of userIds) {
      try {
        const patterns = await analyzeUser(supabase, userId);
        results.push({ userId, status: "success", patterns: patterns.length });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[analyze-user-patterns] Error for ${userId}:`, msg);
        results.push({ userId, status: "error", error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeUser(supabase: any, userId: string): Promise<any[]> {
  // Fetch last 28 days of sessions
  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

  const { data: sessions, error } = await supabase
    .from("wearable_sessions")
    .select("date, source, hrv_avg, resting_hr, sleep_score, activity_score, training_load, total_steps, readiness_score")
    .eq("user_id", userId)
    .gte("date", twentyEightDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (error) throw error;
  if (!sessions || sessions.length < 5) return [];

  // Primary device (fallback for patterns without a clear single source)
  const sourceCounts: Record<string, number> = {};
  for (const s of sessions) sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  const primaryDeviceSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Helper: pick the dominant device from a subset of sessions
  const dominantSource = (subset: any[]): string => {
    if (subset.length === 0) return primaryDeviceSource;
    const counts: Record<string, number> = {};
    for (const s of subset) counts[s.source] = (counts[s.source] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  };

  const patterns: any[] = [];
  const now = new Date().toISOString();

  // ── Sleep patterns by day type ──────────────────────────────────
  const sleepSessions = sessions.filter((s: any) => s.sleep_score !== null);
  if (sleepSessions.length >= 5) {
    const weekday: number[] = [];
    const weekend: number[] = [];
    for (const s of sleepSessions) {
      const dow = new Date(s.date).getDay();
      if (dow === 0 || dow === 6) weekend.push(s.sleep_score);
      else weekday.push(s.sleep_score);
    }
    if (weekday.length >= 3) {
      const weekdaySessions = sleepSessions.filter((s: any) => { const dow = new Date(s.date).getDay(); return dow !== 0 && dow !== 6; });
      patterns.push({
        category: "pattern", key: "sleep_pattern_weekday",
        value: { avg_score: round(avg(weekday), 1), sample_days: weekday.length, trend: trendLabel(weekday) },
        confidence: Math.min(1.0, weekday.length / 10),
        source: "weekly_analysis", device_source: dominantSource(weekdaySessions),
      });
    }
    if (weekend.length >= 2) {
      const weekendSessions = sleepSessions.filter((s: any) => { const dow = new Date(s.date).getDay(); return dow === 0 || dow === 6; });
      patterns.push({
        category: "pattern", key: "sleep_pattern_weekend",
        value: { avg_score: round(avg(weekend), 1), sample_days: weekend.length },
        confidence: Math.min(1.0, weekend.length / 6),
        source: "weekly_analysis", device_source: dominantSource(weekendSessions),
      });
    }
  }

  // ── HRV trend over 14 days ──────────────────────────────────────
  const hrvSessions = sessions.filter((s: any) => s.hrv_avg !== null);
  if (hrvSessions.length >= 5) {
    const recent = hrvSessions.slice(-7).map((s: any) => s.hrv_avg);
    const older  = hrvSessions.slice(0, Math.min(7, hrvSessions.length - 1)).map((s: any) => s.hrv_avg);
    const recentAvg = avg(recent);
    const olderAvg  = avg(older);
    let trend = "stable";
    if (recentAvg !== null && olderAvg !== null && olderAvg > 0) {
      const change = ((recentAvg - olderAvg) / olderAvg) * 100;
      if (change > 5) trend = "improving";
      else if (change < -5) trend = "declining";
    }
    patterns.push({
      category: "pattern", key: "hrv_trend_14d",
      value: { trend, recent_avg: round(recentAvg, 1), older_avg: round(olderAvg, 1), sample_days: hrvSessions.length },
      confidence: Math.min(1.0, hrvSessions.length / 14),
      source: "weekly_analysis", device_source: dominantSource(hrvSessions),
    });
  }

  // ── RHR trend ───────────────────────────────────────────────────
  const rhrSessions = sessions.filter((s: any) => s.resting_hr !== null);
  if (rhrSessions.length >= 5) {
    const recent = rhrSessions.slice(-7).map((s: any) => s.resting_hr);
    const older  = rhrSessions.slice(0, 7).map((s: any) => s.resting_hr);
    patterns.push({
      category: "pattern", key: "rhr_trend_14d",
      value: { recent_avg: round(avg(recent), 1), older_avg: round(avg(older), 1), trend: trendLabel(rhrSessions.map((s: any) => s.resting_hr), true), sample_days: rhrSessions.length },
      confidence: Math.min(1.0, rhrSessions.length / 14),
      source: "weekly_analysis", device_source: dominantSource(rhrSessions),
    });
  }

  // ── Training consistency ────────────────────────────────────────
  const activitySessions = sessions.filter((s: any) => (s.training_load ?? s.activity_score ?? s.total_steps) !== null);
  const loadValues = sessions.map((s: any) =>
    s.training_load ?? s.activity_score ?? (s.total_steps ? s.total_steps / 100 : null)
  ).filter((v): v is number => v !== null);

  if (loadValues.length >= 7) {
    // Days active per week (load > 0)
    const activeDays = loadValues.filter(v => v > 20).length;
    const weeksSpanned = Math.max(1, Math.ceil(sessions.length / 7));
    const daysPerWeek = round(activeDays / weeksSpanned, 1);

    // Week over week change
    const thisWeek  = loadValues.slice(-7);
    const lastWeek  = loadValues.slice(-14, -7);
    const weekChange = lastWeek.length >= 3 && avg(lastWeek) !== null && (avg(lastWeek) as number) > 0
      ? round(((avg(thisWeek) as number - (avg(lastWeek) as number)) / (avg(lastWeek) as number)) * 100, 1)
      : null;

    patterns.push({
      category: "pattern", key: "training_consistency",
      value: { days_active_per_week: daysPerWeek, week_over_week_change_pct: weekChange, sample_days: sessions.length },
      confidence: Math.min(1.0, sessions.length / 28),
      source: "weekly_analysis", device_source: dominantSource(activitySessions),
    });
  }

  // ── Load baseline_profiles for derived signals ──────────────────
  const { data: latestBaseline } = await supabase
    .from("baseline_profiles")
    .select("monotony_index, hrv_streak_below_baseline, acwr, weekly_load_progression_pct, recovery_trend")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestBaseline) {
    const bp = latestBaseline as any;

    // Monotony pattern
    if (bp.monotony_index !== null && bp.monotony_index > 1.5) {
      patterns.push({
        category: "pattern", key: "training_monotony",
        value: { monotony_index: bp.monotony_index, flag: bp.monotony_index > 2.0 ? "high" : "moderate", description: "Same route/pace pattern detected" },
        confidence: 0.9,
        source: "weekly_analysis", device_source: dominantSource(activitySessions),
      });
    }

    // HRV suppression streak
    if (bp.hrv_streak_below_baseline > 2) {
      patterns.push({
        category: "pattern", key: "hrv_suppression_streak",
        value: { consecutive_days: bp.hrv_streak_below_baseline, severity: bp.hrv_streak_below_baseline >= 5 ? "significant" : "noteworthy" },
        confidence: 1.0,
        source: "weekly_analysis", device_source: dominantSource(hrvSessions),
      });
    }
  }

  // ── Write all patterns to user_model ────────────────────────────
  if (patterns.length === 0) return [];

  const rows = patterns.map(p => ({
    user_id:        userId,
    category:       p.category,
    key:            p.key,
    value:          p.value,
    confidence:     p.confidence,
    source:         p.source,
    device_source:  p.device_source,
    first_detected: now,
    last_updated:   now,
    active:         true,
  }));

  const { error: upsertError } = await supabase
    .from("user_model")
    .upsert(rows, { onConflict: "user_id,category,key" });

  if (upsertError) throw upsertError;

  console.log(`[analyze-user-patterns] User ${userId}: wrote ${patterns.length} patterns (primary device: ${primaryDeviceSource})`);
  return patterns;
}

// ── Helpers ───────────────────────────────────────────────────────

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function round(value: number | null, decimals: number): number | null {
  if (value === null || isNaN(value)) return null;
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// trendLabel: for HRV higher is better, for RHR lower is better (invert=true)
function trendLabel(values: number[], invert = false): string {
  if (values.length < 4) return "stable";
  const half = Math.floor(values.length / 2);
  const first = avg(values.slice(0, half));
  const second = avg(values.slice(half));
  if (first === null || second === null || first === 0) return "stable";
  const change = ((second - first) / first) * 100;
  const improving = invert ? change < -3 : change > 3;
  const declining  = invert ? change > 3  : change < -3;
  return improving ? "improving" : declining ? "declining" : "stable";
}
