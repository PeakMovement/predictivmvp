import { createClient } from "npm:@supabase/supabase-js@2";

// M2 Sub-task 4B — Life Formula Engine
// Reads onboarding_signals boolean flags per user, scores all 10 Life Formulas,
// enforces hard device exclusions, assigns primary + up to 2 secondary formulas,
// writes results to user_life_formula table.
//
// Hard device exclusions (from M2 guide):
//   LF-05 (Nervous System Formula): requires F-07 orthostatic — Polar ONLY
//   LF-09 (Chronobiological Formula): requires F-20 sleep midpoint — Oura ONLY
//   LF-10 (Full Spectrum Formula): requires all 3 devices + compHigh = true

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Life Formula definitions
const LIFE_FORMULAS: Record<string, { name: string; deviceConstraint?: string }> = {
  "LF-01": { name: "The Total Organism Formula" },
  "LF-02": { name: "The Spike Shield" },
  "LF-03": { name: "The Silent Grind Detector" },
  "LF-04": { name: "The Sleep-First Formula" },
  "LF-05": { name: "The Nervous System Formula", deviceConstraint: "polar" },
  "LF-06": { name: "The Adaptation Engine" },
  "LF-07": { name: "The Mind-Body Bridge" },
  "LF-08": { name: "The Repair Formula" },
  "LF-09": { name: "The Chronobiological Formula", deviceConstraint: "oura" },
  "LF-10": { name: "The Full Spectrum Formula", deviceConstraint: "all3" },
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
      const { data } = await supabase.from("onboarding_signals").select("user_id");
      userIds = (data || []).map((r: any) => r.user_id);
    }

    console.log(`[calculate-life-formulas] Processing ${userIds.length} users`);

    const results: { userId: string; status: string; primaryLF?: string; error?: string }[] = [];

    for (const userId of userIds) {
      try {
        const primaryLF = await processUser(supabase, userId);
        results.push({ userId, status: "success", primaryLF });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[calculate-life-formulas] Error for user ${userId}:`, msg);
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

async function processUser(supabase: any, userId: string): Promise<string | null> {
  // Read onboarding signals
  const { data: signals, error } = await supabase
    .from("onboarding_signals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!signals) {
    console.log(`[calculate-life-formulas] No onboarding signals for user ${userId}`);
    return null;
  }

  // Determine devices
  const hasOura   = signals.wearable === "oura";
  const hasGarmin = signals.wearable === "garmin";
  const hasPolar  = signals.wearable === "polar";
  const has3      = hasOura && hasGarmin && hasPolar;

  // ── Step 1: Enforce hard device exclusions ───────────────────────
  const hardExcluded = new Set<string>();
  if (!hasPolar) hardExcluded.add("LF-05");
  if (!hasOura)  hardExcluded.add("LF-09");
  if (!has3 || !signals.comp_high) hardExcluded.add("LF-10");

  // ── Step 2: Score all 10 Life Formulas ───────────────────────────
  const scores: Record<string, number> = {};

  for (const lfId of Object.keys(LIFE_FORMULAS)) {
    if (hardExcluded.has(lfId)) {
      scores[lfId] = -999; // excluded
      continue;
    }
    scores[lfId] = scoreLF(lfId, signals);
  }

  // ── Step 3: Rank by score ────────────────────────────────────────
  const ranked = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a);

  // ── Step 4: Write to user_life_formula ───────────────────────────
  const rows: any[] = [];

  // All 10 formulas — excluded ones marked unavailable
  for (const lfId of Object.keys(LIFE_FORMULAS)) {
    const score = scores[lfId];
    const rank = ranked.findIndex(([id]) => id === lfId);
    const isExcluded = score === -999;

    rows.push({
      user_id:       userId,
      formula_id:    lfId,
      formula_name:  LIFE_FORMULAS[lfId].name,
      score:         isExcluded ? null : round(score, 3),
      rank:          isExcluded ? null : rank + 1,
      status:        isExcluded ? "unavailable" : "active",
      device_source: signals.wearable || null,
      updated_at:    new Date().toISOString(),
    });
  }

  const { error: upsertError } = await supabase
    .from("user_life_formula")
    .upsert(rows, { onConflict: "user_id,formula_id" });

  if (upsertError) throw upsertError;

  const primaryLF = ranked[0]?.[0] || null;
  console.log(`[calculate-life-formulas] User ${userId}: primary=${primaryLF}, device=${signals.wearable}, excluded=${Array.from(hardExcluded).join(",")}`);

  return primaryLF;
}

// ── Life Formula scoring ──────────────────────────────────────────────
// Additive point system from Onboarding Decision Map (Scenario Selections PDF).
// Each Q answer adds exact points to specific Life Formulas.
// Returns raw integer score — ranked by highest score.

function scoreLF(lfId: string, s: any): number {
  let pts = 0;
  const goals: string[] = s.health_goals || [];
  const hasGoal = (g: string) => goals.some((v: string) => v.toLowerCase().includes(g));

  // ── Q2: Training type ─────────────────────────────────────────────
  // Endurance: Boosts LF-02, LF-06 (enables ACWR precision)
  // Strength: Boosts LF-02
  // Team: Boosts LF-02
  // Mind-body: Boosts LF-07, LF-08; reduces LF-02
  // Rehab: Strongly boosts LF-03, LF-07
  if (lfId === "LF-02") {
    if (s.is_endurance) pts += 20;
    if (s.is_strength)  pts += 15;
    if (s.is_team_sport) pts += 12;
    if (s.is_mind_body) pts -= 10;
  }
  if (lfId === "LF-06") {
    if (s.is_endurance) pts += 18;
  }
  if (lfId === "LF-07") {
    if (s.is_mind_body)   pts += 28;
    if (s.is_rehab_focus) pts += 20;
  }
  if (lfId === "LF-08") {
    if (s.is_mind_body)   pts += 14;
    if (s.is_rehab_focus) pts += 10;
  }
  if (lfId === "LF-03") {
    if (s.is_rehab_focus) pts += 22;
  }

  // ── Q3: Stress level ──────────────────────────────────────────────
  // stressHigh → LF-07 strong, LF-01 boost; penalises LF-02, LF-06
  // stressLow  → LF-02 clean, LF-06 boost; reduces LF-07
  if (s.stress_high) {
    if (lfId === "LF-07") pts += 30;
    if (lfId === "LF-01") pts += 18;
    if (lfId === "LF-02") pts -= 15;
    if (lfId === "LF-06") pts -= 12;
    if (lfId === "LF-10") pts += 10; // trigger if all devices present
  }
  if (s.stress_med) {
    if (lfId === "LF-09") pts += 10;
  }
  if (s.stress_low) {
    if (lfId === "LF-02") pts += 14;
    if (lfId === "LF-06") pts += 12;
    if (lfId === "LF-07") pts -= 8;
  }

  // ── Q4: Sleep quality ─────────────────────────────────────────────
  // sleepPoor (short <6.5h) → LF-04 +44, LF-08, LF-03
  // sleepDisrupted (shift work etc.) → LF-04 +38, LF-09
  // sleepOk → LF-02, LF-06 boost; LF-04 mild penalty
  if (s.sleep_poor) {
    const isPoor = s.sleep_quality === "short";
    const isDisrupted = s.sleep_quality === "disrupted";
    if (lfId === "LF-04") pts += isPoor ? 44 : isDisrupted ? 38 : 40;
    if (lfId === "LF-08") pts += 12;
    if (lfId === "LF-03") pts += 10;
    if (lfId === "LF-09" && isDisrupted) pts += 16;
  }
  if (s.sleep_ok) {
    if (lfId === "LF-02") pts += 10;
    if (lfId === "LF-06") pts += 10;
    if (lfId === "LF-04") pts -= 8;
  }
  if (s.sleep_variable) {
    if (lfId === "LF-09") pts += 12;
  }

  // ── Q5: Compliance ───────────────────────────────────────────────
  // compHigh: required for LF-10, LF-05; boosts LF-07, LF-01
  // compLow: boosts LF-03 (passive), LF-09; penalises LF-05
  if (s.comp_high) {
    if (lfId === "LF-07") pts += 12;
    if (lfId === "LF-01") pts += 10;
  }
  if (s.comp_med) {
    if (lfId === "LF-02") pts += 8;
    if (lfId === "LF-06") pts += 8;
  }
  if (s.comp_low) {
    if (lfId === "LF-03") pts += 14;
    if (lfId === "LF-09") pts += 10;
    if (lfId === "LF-05") pts -= 12;
  }

  // ── Q6: Health goals — exact points from PDF ─────────────────────
  if (hasGoal("injury_prevent") || hasGoal("injury")) {
    if (lfId === "LF-02") pts += 18;
    if (lfId === "LF-03") pts += 16;
    if (lfId === "LF-05") pts += 8;
    // Compound: wantsInjPrev + stressHigh → LF-07 +12
    if (lfId === "LF-07" && s.stress_high) pts += 12;
  }
  if (hasGoal("performance")) {
    if (lfId === "LF-06") pts += 38;
    if (lfId === "LF-02") pts += 10;
    // Compound: wantsPerf + wantsInjPrev → LF-10 +20
    if (lfId === "LF-10" && (hasGoal("injury_prevent") || hasGoal("injury"))) pts += 20;
  }
  if (hasGoal("recover")) {
    if (lfId === "LF-08") pts += 32;
    if (lfId === "LF-04") pts += 16;
    if (lfId === "LF-05") pts += 8;
  }
  if (hasGoal("stress")) {
    if (lfId === "LF-07") pts += 32;
    if (lfId === "LF-01") pts += 14;
  }
  if (hasGoal("longev")) {
    if (lfId === "LF-08") pts += 18;
    if (lfId === "LF-01") pts += 8;
  }
  if (hasGoal("rehab")) {
    if (lfId === "LF-03") pts += 18;
    if (lfId === "LF-07") pts += 10;
    if (lfId === "LF-08") pts += 10;
    if (lfId === "LF-04") pts += 4;
  }

  // ── Q7: Injury history — exact points from PDF ───────────────────
  if (s.inj_none) {
    if (lfId === "LF-02") pts += 12;
    if (lfId === "LF-03") pts -= 5;
  }
  if (s.inj_overuse) {
    if (lfId === "LF-03") pts += 32;
    if (lfId === "LF-02") pts -= 12;
  }
  if (s.inj_acute) {
    if (lfId === "LF-03") pts += 10;
  }
  if (s.inj_current) {
    if (lfId === "LF-03") pts += 24;
    if (lfId === "LF-07") pts += 8;
    if (lfId === "LF-08") pts += 8;
    if (lfId === "LF-02") pts -= 12;
  }
  if (s.inj_recurring) {
    // Multiple: injRecurring + injOveruse combined
    if (lfId === "LF-03") pts += 28 + 32; // combined max
    if (lfId === "LF-02") pts -= 12;
  }

  return Math.max(0, pts); // floor at 0 — negative scores just mean not a fit
}

// ── Helpers ───────────────────────────────────────────────────────────

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
