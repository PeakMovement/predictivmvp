import { createClient } from "npm:@supabase/supabase-js@2";

// M2 Sub-task 3 — Baseline Engine
// Reads wearable_sessions for the last 30 days, computes all M2 baseline signals,
// writes to baseline_profiles. Called daily after wearable sync.
//
// Computes:
//   - 7-day acute and 30-day chronic averages (HRV, RHR, sleep, load)
//   - Deviation % from 30-day baseline
//   - ACWR (7d/30d load ratio)
//   - Recovery trend (3d HRV vs 7d HRV)
//   - Anomaly score
//   - HRV streak below baseline (consecutive days < 90% of 30d avg)
//   - Weekly load progression %
//   - Monotony index / F-04 (mean TRIMP / SD TRIMP over 7 days)
//   - available_formulas[] based on device + data availability

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json().catch(() => ({}));
    const { user_id } = body;

    // Determine which users to process
    let userIds: string[] = [];
    if (user_id) {
      userIds = [user_id];
    } else {
      // All users with wearable data in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: recentUsers } = await supabase
        .from("wearable_sessions")
        .select("user_id")
        .gte("date", sevenDaysAgo.toISOString().split("T")[0]);
      const unique = new Set((recentUsers || []).map((r: any) => r.user_id));
      userIds = Array.from(unique);
    }

    console.log(`[calculate-baselines] Processing ${userIds.length} users`);

    const results: { userId: string; status: string; error?: string }[] = [];

    for (const userId of userIds) {
      try {
        await processUser(supabase, userId);
        results.push({ userId, status: "success" });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[calculate-baselines] Error for user ${userId}:`, msg);
        results.push({ userId, status: "error", error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[calculate-baselines] Fatal error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Per-user baseline computation ───────────────────────────────────

async function processUser(supabase: any, userId: string) {
  const today = new Date().toISOString().split("T")[0];

  // Fetch last 35 days (30 chronic + buffer for streak counting)
  const thirtyFiveDaysAgo = new Date();
  thirtyFiveDaysAgo.setDate(thirtyFiveDaysAgo.getDate() - 35);

  const { data: sessions, error } = await supabase
    .from("wearable_sessions")
    .select("date, source, hrv_avg, resting_hr, sleep_score, sleep_efficiency, activity_score, total_steps, training_load, readiness_score, temperature_deviation")
    .eq("user_id", userId)
    .gte("date", thirtyFiveDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) throw error;
  if (!sessions || sessions.length === 0) {
    console.log(`[calculate-baselines] No sessions found for user ${userId}`);
    return;
  }

  // Determine primary device source
  const sourceCounts: Record<string, number> = {};
  for (const s of sessions) {
    sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  }
  const deviceSource = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0][0];

  // Sort sessions ascending for streak calculation
  const sortedAsc = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  const sortedDesc = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  // ── Window slices ────────────────────────────────────────────────
  const last7  = sortedDesc.slice(0, 7);
  const last30 = sortedDesc.slice(0, 30);
  const last3  = sortedDesc.slice(0, 3);

  const todaySession = sortedDesc[0];
  const todayHrv = todaySession?.hrv_avg ?? null;

  // ── Averages ─────────────────────────────────────────────────────
  const hrv7   = avg(last7.map((s: any)  => s.hrv_avg));
  const hrv30  = avg(last30.map((s: any) => s.hrv_avg));
  const hrv3   = avg(last3.map((s: any)  => s.hrv_avg));

  const rhr7   = avg(last7.map((s: any)  => s.resting_hr));
  const rhr30  = avg(last30.map((s: any) => s.resting_hr));

  const sleep7  = avg(last7.map((s: any)  => s.sleep_score));
  const sleep30 = avg(last30.map((s: any) => s.sleep_score));

  const sleepEff7  = avg(last7.map((s: any)  => s.sleep_efficiency));
  const sleepEff30 = avg(last30.map((s: any) => s.sleep_efficiency));

  // Load: prefer training_load (Garmin), fall back to activity_score (Oura), then steps
  const loadValues = (sessions: any[]) => sessions.map((s: any) =>
    s.training_load ?? s.activity_score ?? (s.total_steps ? s.total_steps / 100 : null)
  );
  const load7  = avg(loadValues(last7));
  const load30 = avg(loadValues(last30));

  // ── Deviations ────────────────────────────────────────────────────
  const hrvDevPct   = deviationPct(todayHrv, hrv30);
  const rhrDevPct   = deviationPct(todaySession?.resting_hr ?? null, rhr30);
  const sleepDevPct = deviationPct(todaySession?.sleep_score ?? null, sleep30);

  // ── ACWR ─────────────────────────────────────────────────────────
  let acwr: number | null = null;
  let acwrSource = "unavailable";
  if (load7 !== null && load30 !== null && load30 > 0) {
    acwr = round(load7 / load30, 3);
    acwrSource = deviceSource === "garmin" ? "full" : "rpe_estimated";
  }

  // ── Recovery trend ────────────────────────────────────────────────
  let recoveryTrend: "improving" | "stable" | "declining" = "stable";
  if (hrv3 !== null && hrv7 !== null && hrv7 > 0) {
    const diff = ((hrv3 - hrv7) / hrv7) * 100;
    if (diff > 5) recoveryTrend = "improving";
    else if (diff < -5) recoveryTrend = "declining";
  }

  // ── Anomaly score ─────────────────────────────────────────────────
  const anomalyScore = hrvDevPct !== null
    ? round(Math.min(1.0, Math.abs(hrvDevPct) / 30), 3)
    : null;

  // ── HRV streak below baseline ─────────────────────────────────────
  // Count consecutive days (most recent first) where hrv < 30d_avg * 0.9
  let hrvStreak = 0;
  if (hrv30 !== null) {
    const threshold = hrv30 * 0.9;
    for (const s of sortedDesc) {
      if (s.hrv_avg !== null && s.hrv_avg < threshold) {
        hrvStreak++;
      } else {
        break; // streak broken
      }
    }
  }

  // ── Weekly load progression % ─────────────────────────────────────
  // This week (last 7 days) vs previous week (days 8-14)
  let weeklyLoadPct: number | null = null;
  const prevWeek = sortedDesc.slice(7, 14);
  if (prevWeek.length > 0) {
    const thisWeekLoad = sum(loadValues(last7));
    const prevWeekLoad = sum(loadValues(prevWeek));
    if (prevWeekLoad !== null && prevWeekLoad > 0 && thisWeekLoad !== null) {
      weeklyLoadPct = round(((thisWeekLoad - prevWeekLoad) / prevWeekLoad) * 100, 1);
    }
  }

  // ── Monotony index F-04 ───────────────────────────────────────────
  // mean(7-day TRIMP) / SD(7-day TRIMP)
  // Values >2.0 trigger monotony language
  let monotonyIndex: number | null = null;
  const trimps = loadValues(last7).filter((v): v is number => v !== null);
  if (trimps.length >= 3) {
    const meanTrimp = trimps.reduce((a, b) => a + b, 0) / trimps.length;
    const sd = stdDev(trimps);
    if (sd !== null && sd > 0) {
      monotonyIndex = round(meanTrimp / sd, 2);
    }
  }

  // ── F-06: HRV Suppression Index ──────────────────────────────────
  // (most_recent_hrv - hrv_28d_avg) / hrv_28d_avg * 100
  // Negative = suppressed. Oura/Polar = full, Garmin = partial
  let f06Value: number | null = null;
  let f06Status = "unavailable";
  const recentHrvSession = sortedDesc.find((s: any) => s.hrv_avg !== null);
  const hrv28 = avg(sortedDesc.slice(0, 28).map((s: any) => s.hrv_avg));
  if (recentHrvSession && hrv28 !== null && hrv28 > 0) {
    f06Value = round(((recentHrvSession.hrv_avg - hrv28) / hrv28) * 100, 1);
    f06Status = deviceSource === "garmin" ? "partial" : "full";
  }

  // ── F-10: Sleep Debt Accumulation ─────────────────────────────────
  // sum(8h - estimated_sleep_hours) over last 7 days
  // sleep_score → hours: 90+=8h, 80-89=7.5h, 70-79=7h, 60-69=6h, <60=5.5h
  let f10Value: number | null = null;
  let f10Status = "unavailable";
  const sleepSessions = last7.filter((s: any) => s.sleep_score !== null);
  if (sleepSessions.length > 0) {
    const totalDebt = sleepSessions.reduce((debt: number, s: any) => {
      const estimatedHours = s.sleep_score >= 90 ? 8
        : s.sleep_score >= 80 ? 7.5
        : s.sleep_score >= 70 ? 7
        : s.sleep_score >= 60 ? 6
        : 5.5;
      return debt + Math.max(0, 8 - estimatedHours);
    }, 0);
    f10Value = round(totalDebt, 2);
    f10Status = deviceSource === "oura" ? "full" : "partial";
  }

  // ── F-14: Allostatic Load Score ───────────────────────────────────
  // Z-score composite of available deviations, normalised to 0-1
  // Higher = more allostatic stress
  let f14Value: number | null = null;
  let f14Status = "unavailable";
  const devScores: number[] = [];
  if (hrvDevPct !== null)   devScores.push(Math.abs(hrvDevPct) / 30);
  if (rhrDevPct !== null)   devScores.push(Math.abs(rhrDevPct) / 30);
  if (sleepDevPct !== null) devScores.push(Math.abs(sleepDevPct) / 30);
  if (devScores.length >= 2) {
    f14Value = round(Math.min(1.0, devScores.reduce((a, b) => a + b, 0) / devScores.length), 3);
    f14Status = deviceSource === "oura" ? "full" : "partial";
  }

  // ── F-19: Readiness Composite Score ──────────────────────────────
  // Weighted composite: HRV% (40%), sleep% (30%), ACWR safety (20%), recovery trend (10%)
  // Output: 0-100 score
  let f19Value: number | null = null;
  let f19Status = "unavailable";
  const f19Components: { weight: number; score: number }[] = [];

  if (hrv7 !== null && hrv30 !== null && hrv30 > 0) {
    // HRV component: 100 = at or above baseline, decays below
    const hrvRatio = Math.min(1.0, hrv7 / hrv30);
    f19Components.push({ weight: 0.40, score: hrvRatio * 100 });
  }
  if (sleep7 !== null) {
    f19Components.push({ weight: 0.30, score: Math.min(100, sleep7) });
  }
  if (acwr !== null) {
    // ACWR safety: 100 at 0.8-1.3, drops above/below
    const acwrScore = acwr >= 0.8 && acwr <= 1.3 ? 100
      : acwr > 1.3 && acwr <= 1.5 ? 70
      : acwr > 1.5 ? 40
      : 60; // below 0.8 = undertraining
    f19Components.push({ weight: 0.20, score: acwrScore });
  }
  // Recovery trend component
  const trendScore = recoveryTrend === "improving" ? 100 : recoveryTrend === "stable" ? 70 : 40;
  f19Components.push({ weight: 0.10, score: trendScore });

  if (f19Components.length >= 2) {
    const totalWeight = f19Components.reduce((s, c) => s + c.weight, 0);
    const weightedSum = f19Components.reduce((s, c) => s + c.score * c.weight, 0);
    f19Value = round(weightedSum / totalWeight, 1);
    f19Status = f19Components.length >= 3 ? "full" : "partial";
  }

  // ── F-12: Temperature Deviation Alert ────────────────────────────
  // Oura Gen 3+ only. temperature_deviation is already expressed as °C
  // deviation from the user's personal baseline (computed by Oura), so we
  // take the most recent non-null value and classify severity directly.
  let f12Value: number | null = null;
  let f12Status = "unavailable";

  if (deviceSource === "oura") {
    const recentTemp = sessions
      .slice()
      .sort((a: any, b: any) => b.date.localeCompare(a.date))
      .find((s: any) => s.temperature_deviation !== null);

    if (recentTemp) {
      f12Value = round(Number(recentTemp.temperature_deviation), 2);
      const abs = Math.abs(f12Value!);
      f12Status = abs >= 0.5 ? "alert" : abs >= 0.3 ? "elevated" : "normal";
    }
  }

  // ── Baseline confidence ───────────────────────────────────────────
  // Lower confidence for new users with less than 7 days of data
  const dataDays = sessions.length;
  const confidence = dataDays >= 30 ? 1.0
    : dataDays >= 14 ? 0.8
    : dataDays >= 7  ? 0.6
    : 0.4;

  // ── Available formulas ────────────────────────────────────────────
  const availableFormulas = computeAvailableFormulas(deviceSource, sessions, hrv30, load30);

  // ── Write to baseline_profiles ─────────────────────────────────────
  const { error: upsertError } = await supabase
    .from("baseline_profiles")
    .upsert({
      user_id:                     userId,
      date:                        today,
      device_source:               deviceSource,
      hrv_7d_avg:                  round(hrv7, 2),
      rhr_7d_avg:                  round(rhr7, 2),
      sleep_score_7d_avg:          round(sleep7, 2),
      sleep_efficiency_7d_avg:     round(sleepEff7, 2),
      load_7d_avg:                 round(load7, 2),
      hrv_30d_avg:                 round(hrv30, 2),
      rhr_30d_avg:                 round(rhr30, 2),
      sleep_score_30d_avg:         round(sleep30, 2),
      sleep_efficiency_30d_avg:    round(sleepEff30, 2),
      load_30d_avg:                round(load30, 2),
      hrv_deviation_pct:           round(hrvDevPct, 1),
      rhr_deviation_pct:           round(rhrDevPct, 1),
      sleep_deviation_pct:         round(sleepDevPct, 1),
      acwr:                        acwr,
      acwr_source:                 acwrSource,
      recovery_trend:              recoveryTrend,
      anomaly_score:               anomalyScore,
      hrv_streak_below_baseline:   hrvStreak,
      weekly_load_progression_pct: weeklyLoadPct,
      monotony_index:              monotonyIndex,
      baseline_confidence:         confidence,
      data_days_available:         dataDays,
      available_formulas:          availableFormulas,
      f06_hrv_suppression_value:   f06Value,
      f06_hrv_suppression_status:  f06Status,
      f10_sleep_debt_hours:        f10Value,
      f10_sleep_debt_status:       f10Status,
      f14_allostatic_load_value:   f14Value,
      f14_allostatic_load_status:  f14Status,
      f19_readiness_value:         f19Value,
      f19_readiness_status:        f19Status,
      f12_temp_deviation_value:    f12Value,
      f12_temp_deviation_status:   f12Status,
      computed_at:                 new Date().toISOString(),
    }, { onConflict: "user_id,date,device_source" });

  if (upsertError) throw upsertError;

  console.log(`[calculate-baselines] User ${userId}: hrv30=${hrv30}, acwr=${acwr}, streak=${hrvStreak}, monotony=${monotonyIndex}, f06=${f06Value}(${f06Status}), f10=${f10Value}h, f14=${f14Value}, f19=${f19Value}, formulas=${availableFormulas.length}`);
}

// ── Available formulas computation ───────────────────────────────────
// Determines which M2 formulas can be computed for this user+device

function computeAvailableFormulas(
  device: string,
  sessions: any[],
  hrv30: number | null,
  load30: number | null
): string[] {
  const formulas: string[] = [];
  const hasHrv   = hrv30 !== null;
  const hasLoad  = load30 !== null;
  const hasSleep = sessions.some((s: any) => s.sleep_score !== null);
  const hasTemp  = device === "oura" && sessions.some((s: any) => s.temperature_deviation !== null);

  // F-02: ACWR Rolling Average — Oura=estimated, Garmin/Polar=full
  if (hasLoad) formulas.push(device === "garmin" || device === "polar" ? "F-02" : "F-02(est)");

  // F-03: ACWR-EWMA — same as F-02
  if (hasLoad) formulas.push(device === "garmin" || device === "polar" ? "F-03" : "F-03(est)");

  // F-04: Monotony + Strain — Oura=estimated, Garmin/Polar=full
  if (hasLoad) formulas.push(device === "garmin" || device === "polar" ? "F-04" : "F-04(est)");

  // F-06: HRV Suppression Index — Oura/Polar=full, Garmin=partial
  if (hasHrv) formulas.push(device === "garmin" ? "F-06(partial)" : "F-06");

  // F-10: Sleep Debt Accumulation — Oura=full, Garmin/Polar=partial
  if (hasSleep) formulas.push(device === "oura" ? "F-10" : "F-10(partial)");

  // F-12: Temperature Deviation Alert — Oura ONLY (requires skin temp)
  if (hasTemp) formulas.push("F-12");

  // F-14: Allostatic Load Score — Oura=full, Garmin/Polar=partial
  if (hasHrv && hasSleep) formulas.push(device === "oura" ? "F-14" : "F-14(partial)");

  // F-19: Readiness Composite Score — all devices
  if (hasHrv || hasSleep) formulas.push("F-19");

  return formulas;
}

// ── Math helpers ──────────────────────────────────────────────────────

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function sum(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0);
}

function stdDev(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function deviationPct(today: number | null, baseline: number | null): number | null {
  if (today === null || baseline === null || baseline === 0) return null;
  return ((today - baseline) / baseline) * 100;
}

function round(value: number | null, decimals: number): number | null {
  if (value === null || isNaN(value)) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
