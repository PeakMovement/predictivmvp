import { ShieldAlert, Shield, ShieldCheck } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

interface RecoveryTrend {
  acwr: number | null;
  strain: number | null;
  monotony: number | null;
  period_date: string;
}

interface WearableSession {
  hrv_avg: number | null;
  sleep_score: number | null;
  date: string;
}

// ── Score calculation ──────────────────────────────────────────────────────
//
// Four factors, each contributes a capped number of points:
//   ACWR         — up to 30 pts
//   Fatigue      — up to 20 pts  (strain + monotony combined)
//   HRV drop     — up to 25 pts
//   Sleep drop   — up to 25 pts
// Total max = 100
//
// Color bands (match user spec):
//   0–33   green  → Low
//   34–66  yellow → Moderate
//   67–100 red    → High

interface ScoreResult {
  score: number;
  level: "low" | "moderate" | "high" | "unknown";
  explanation: string;
  componentScores: { acwr: number; fatigue: number; hrv: number; sleep: number };
  factors: {
    acwr: number;
    fatigueIndex: number;
    hrvDropPct: number | null;
    sleepScore: number | null;
    baselineHrv: number | null;
  };
}

function calcScore(
  trends: RecoveryTrend[],
  sessions: WearableSession[],
  hrvBaseline: number | null,
  latestHrv?: number | null,
  latestSleep?: number | null,
): ScoreResult {
  if (trends.length === 0 && sessions.length === 0) {
    return { score: 0, level: "unknown", explanation: "", componentScores: { acwr: 0, fatigue: 0, hrv: 0, sleep: 0 }, factors: { acwr: 0, fatigueIndex: 0, hrvDropPct: null, sleepScore: null, baselineHrv: null } };
  }

  // ── ACWR factor (0–30) ──────────────────────────────────────────────────
  const validAcwr = trends.filter(t => t.acwr !== null);
  const avgACWR = validAcwr.length
    ? validAcwr.reduce((s, t) => s + (t.acwr ?? 0), 0) / validAcwr.length
    : 0;

  let acwrPts = 0;
  if (avgACWR > 1.5) acwrPts = 30;
  else if (avgACWR > 1.3) acwrPts = 20;
  else if (avgACWR > 1.1) acwrPts = 10;

  // ── Fatigue factor (0–20, from strain + monotony) ──────────────────────
  const validStrain = trends.filter(t => t.strain !== null);
  const validMonotony = trends.filter(t => t.monotony !== null);
  const avgStrain = validStrain.length
    ? validStrain.reduce((s, t) => s + (t.strain ?? 0), 0) / validStrain.length
    : 0;
  const avgMonotony = validMonotony.length
    ? Math.min(validMonotony.reduce((s, t) => s + (t.monotony ?? 0), 0) / validMonotony.length, 2.5)
    : 0;

  // FIX 1: Use divisor 2000 (strain/2000)*50 — matches backend identify-risk-drivers formula
  const fatigueIndex = Math.min(100, Math.round((Math.min(avgStrain, 2000) / 2000) * 50 + (avgMonotony / 2.5) * 50));
  let fatiguePts = 0;
  if (fatigueIndex > 70) fatiguePts = 20;
  else if (fatigueIndex > 50) fatiguePts = 10;

  // ── HRV drop factor (0–25) ─────────────────────────────────────────────
  // FIX 4: Use pre-fetched user_baselines 30-day rolling avg rather than computing locally
  let hrvPts = 0;
  let hrvDropPct: number | null = null;
  const baselineHrv: number | null = hrvBaseline;
  const todayHrv = sessions[0]?.hrv_avg ?? null;

  if (todayHrv && baselineHrv && baselineHrv > 0) {
    hrvDropPct = ((baselineHrv - todayHrv) / baselineHrv) * 100;
    if (hrvDropPct >= 25) hrvPts = 25;
    else if (hrvDropPct >= 15) hrvPts = 15;
    else if (hrvDropPct >= 10) hrvPts = 8;
  }

  // ── Sleep factor (0–25) ────────────────────────────────────────────────
  let sleepPts = 0;
  const sleepScore = sessions[0]?.sleep_score ?? null;
  if (sleepScore !== null) {
    if (sleepScore < 55) sleepPts = 25;
    else if (sleepScore < 65) sleepPts = 15;
    else if (sleepScore < 75) sleepPts = 8;
  }

  const score = Math.min(100, acwrPts + fatiguePts + hrvPts + sleepPts);

  let level: ScoreResult["level"] = "low";
  if (score >= 67) level = "high";
  else if (score >= 34) level = "moderate";

  // ── Contextual 1-line explanation (biggest driver wins) ────────────────
  const drivers: Array<{ pts: number; msg: string }> = [
    { pts: acwrPts, msg: `ACWR ${avgACWR.toFixed(2)} — reduce training load to avoid overtraining` },
    { pts: fatiguePts, msg: avgMonotony > (Math.min(avgStrain, 2000) / 2000) * 2.5 ? "High training monotony — vary your training intensity" : "High accumulated strain — prioritise recovery" },
    { pts: hrvPts, msg: `HRV down ${hrvDropPct !== null ? Math.round(hrvDropPct) : "—"}% from baseline — your body needs extra recovery` },
    { pts: sleepPts, msg: `Sleep score ${sleepScore ?? "—"} — poor sleep is impacting your recovery` },
  ];

  const topDriver = drivers.sort((a, b) => b.pts - a.pts)[0];
  let explanation: string;
  if (score === 0) {
    explanation = "Training load is well balanced — keep it up.";
  } else if (level === "low") {
    explanation = "Training load is manageable — monitor and stay consistent.";
  } else {
    explanation = topDriver.msg;
  }

  return {
    score,
    level,
    explanation,
    componentScores: { acwr: acwrPts, fatigue: fatiguePts, hrv: hrvPts, sleep: sleepPts },
    factors: { acwr: avgACWR, fatigueIndex, hrvDropPct, sleepScore, baselineHrv },
  };
}

// ── Component ──────────────────────────────────────────────────────────────

export const RiskScoreCard = () => {
  const [trends, setTrends] = useState<RecoveryTrend[]>([]);
  const [sessions, setSessions] = useState<WearableSession[]>([]);
  const [hrvBaseline, setHrvBaseline] = useState<number | null>(null);
  const [prev, setPrev] = useState<{ score: number; components: Record<string, number> } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      setUserId(user.id);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffStr = cutoff.toISOString().split("T")[0];

      const todayStr = new Date().toISOString().split("T")[0];
      const [{ data: trendData }, { data: sessionData }, { data: baselineData }, { data: prevRow }] = await Promise.all([
        supabase
          .from("recovery_trends")
          .select("acwr, strain, monotony, period_date")
          .eq("user_id", user.id)
          .gte("period_date", cutoffStr)
          .order("period_date", { ascending: false }),
        supabase
          .from("wearable_sessions")
          .select("hrv_avg, sleep_score, date")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(3),
        // FIX 4: HRV baseline from user_baselines (30-day rolling avg)
        supabase
          .from("user_baselines")
          .select("rolling_avg")
          .eq("user_id", user.id)
          .eq("metric", "hrv")
          .maybeSingle(),
        supabase
          .from("risk_score_history")
          .select("score, component_scores, calculated_at")
          .eq("user_id", user.id)
          .lt("calculated_at", todayStr)
          .order("calculated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setTrends(trendData || []);
      setSessions(sessionData || []);
      setHrvBaseline(baselineData?.rolling_avg ?? null);
      if (prevRow && typeof prevRow.score === "number") {
        setPrev({ score: prevRow.score, components: (prevRow.component_scores as Record<string, number>) ?? {} });
      }
      setIsLoading(false);
    };

    load();
  }, []);

  const { score, level, explanation, componentScores, factors } = useMemo(
    () => calcScore(trends, sessions, hrvBaseline),
    [trends, sessions, hrvBaseline],
  );

  // ── "Why it moved": day-over-day delta + biggest-moving factor ──────────
  const movement = useMemo(() => {
    if (!prev) return null;
    const delta = score - prev.score;
    const labels: Record<string, string> = { acwr: "training load", fatigue: "fatigue", hrv: "HRV", sleep: "sleep" };
    let topKey = ""; let topDiff = 0;
    for (const k of Object.keys(componentScores) as Array<keyof typeof componentScores>) {
      const diff = componentScores[k] - (prev.components?.[k] ?? 0);
      if (Math.abs(diff) > Math.abs(topDiff)) { topDiff = diff; topKey = k; }
    }
    return { delta, driver: labels[topKey], driverDiff: topDiff };
  }, [prev, score, componentScores]);


  // FIX 5: Persist risk score to risk_score_history (once per day, upsert on unique user_id+calculated_at)
  useEffect(() => {
    if (!userId || level === "unknown" || isLoading) return;
    const today = new Date().toISOString().split("T")[0];
    supabase
      .from("risk_score_history")
      .upsert(
        { user_id: userId, calculated_at: today, score, component_scores: componentScores },
        { onConflict: "user_id,calculated_at" },
      )
      .then(({ error }) => {
        if (error) console.error("[RiskScoreCard] Failed to persist risk score:", error);
      });
  }, [userId, score, level, componentScores, isLoading]);

  // ── Colors ─────────────────────────────────────────────────────────────

  const colors = {
    low: {
      icon: "text-bioGreen bg-bioGreen/20 border-bioGreen/30",
      bar: "bg-bioGreen",
      pill: "text-bioGreen bg-bioGreen/20 border-bioGreen/30",
      msg: "text-bioGreen bg-bioGreen/10 border-bioGreen/20",
    },
    moderate: {
      icon: "text-yellow-400 bg-amber/20 border-amber/30",
      bar: "bg-amber",
      pill: "text-yellow-400 bg-amber/20 border-amber/30",
      msg: "text-yellow-400 bg-amber/10 border-amber/20",
    },
    high: {
      icon: "text-red-400 bg-critical/20 border-critical/30",
      bar: "bg-critical",
      pill: "text-red-400 bg-critical/20 border-critical/30",
      msg: "text-red-400 bg-critical/10 border-critical/20",
    },
    unknown: {
      icon: "text-muted-foreground bg-muted/20 border-muted/30",
      bar: "bg-muted",
      pill: "text-muted-foreground bg-muted/20 border-muted/30",
      msg: "text-muted-foreground bg-muted/10 border-muted/20",
    },
  }[level];

  const Icon = level === "high" ? ShieldAlert : level === "moderate" ? Shield : ShieldCheck;
  const levelLabel = level === "unknown" ? "—" : level.charAt(0).toUpperCase() + level.slice(1);

  if (isLoading) {
    return (
      <div className="bg-glass rounded-md border border-glass-border p-6 animate-pulse">
        <div className="h-6 bg-muted/30 rounded w-1/3 mb-4" />
        <div className="h-16 bg-muted/30 rounded w-full" />
      </div>
    );
  }

  if (level === "unknown") {
    return (
      <div className="bg-glass rounded-md border border-glass-border p-6 ">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md flex items-center justify-center border text-muted-foreground bg-muted/20 border-muted/30">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Risk Score</h3>
            <p className="text-xs text-muted-foreground">7-day injury risk assessment</p>
          </div>
        </div>
        <div className=" border border-muted/30 bg-muted/10 p-4 text-center space-y-1">
          <p className="text-sm text-muted-foreground">No training data yet.</p>
          <p className="text-xs text-muted-foreground">Connect a wearable and sync to see your risk score.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass rounded-md border border-glass-border p-4 sm:p-6 hover:bg-glass-highlight transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-md flex items-center justify-center border", colors.icon)}>
            <Icon size={22} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Risk Score</h3>
            <p className="text-xs text-muted-foreground">7-day injury risk assessment</p>
          </div>
        </div>
        <div className={cn("px-3 py-1 text-sm font-bold border", colors.pill)}>
          {score} · {levelLabel}
        </div>
      </div>

      {/* Progress bar — divided into 3 zones */}
      <div className="mb-1">
        <div className="h-3 overflow-hidden flex">
          <div className="bg-bioGreen/40 flex-[33]" />
          <div className="bg-amber/40 flex-[33] mx-0.5" />
          <div className="bg-critical/40 flex-[34]" />
        </div>
        {/* Indicator */}
        <div className="relative h-1.5 mt-0.5">
          <div
            className={cn("absolute top-0 w-2 h-2 -translate-x-1/2 -translate-y-1/2", colors.bar)}
            style={{ left: `${score}%` }}
          />
        </div>
      </div>
      <div className="flex justify-between text-[12px] text-muted-foreground mb-4 mt-2">
        <span>Low (0–33)</span>
        <span>Moderate (34–66)</span>
        <span>High (67–100)</span>
      </div>

      {/* Contextual explanation */}
      <div className={cn("p-3 rounded-md border text-sm mb-3", colors.msg)}>
        {explanation}
      </div>

      {/* Why it moved — day-over-day delta + biggest driver (Pro) */}
      <FeatureGate min="pro">
      {movement && movement.delta !== 0 && (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground mb-4">
          <span className={cn("font-semibold", movement.delta > 0 ? "text-red-400" : "text-bioGreen")}>
            {movement.delta > 0 ? "\u25B2" : "\u25BC"} {Math.abs(movement.delta)} vs yesterday
          </span>
          {movement.driver && (
            <span>· {movement.driverDiff > 0 ? "rising" : "easing"} {movement.driver} drove the change</span>
          )}
        </div>
      )}
      </FeatureGate>

      {/* Contributing factors */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-glass/30 rounded-md p-2">
          <p className="text-[12px] text-muted-foreground mb-0.5">ACWR</p>
          <p className={cn("text-sm font-semibold", factors.acwr > 1.5 ? "text-red-400" : factors.acwr > 1.3 ? "text-yellow-400" : "text-foreground")}>
            {factors.acwr.toFixed(2)}
          </p>
        </div>
        <div className="bg-glass/30 rounded-md p-2">
          <p className="text-[12px] text-muted-foreground mb-0.5">Fatigue</p>
          <p className={cn("text-sm font-semibold", factors.fatigueIndex > 70 ? "text-red-400" : factors.fatigueIndex > 50 ? "text-yellow-400" : "text-foreground")}>
            {factors.fatigueIndex}%
          </p>
        </div>
        <div className="bg-glass/30 rounded-md p-2">
          <p className="text-[12px] text-muted-foreground mb-0.5">HRV Δ</p>
          <p className={cn("text-sm font-semibold", factors.hrvDropPct !== null && factors.hrvDropPct >= 20 ? "text-red-400" : factors.hrvDropPct !== null && factors.hrvDropPct >= 10 ? "text-yellow-400" : "text-foreground")}>
            {factors.hrvDropPct !== null ? `${Math.round(factors.hrvDropPct) > 0 ? "-" : "+"}${Math.abs(Math.round(factors.hrvDropPct))}%` : "—"}
          </p>
        </div>
        <div className="bg-glass/30 rounded-md p-2">
          <p className="text-[12px] text-muted-foreground mb-0.5">Sleep</p>
          <p className={cn("text-sm font-semibold", factors.sleepScore !== null && factors.sleepScore < 60 ? "text-red-400" : factors.sleepScore !== null && factors.sleepScore < 70 ? "text-yellow-400" : "text-foreground")}>
            {factors.sleepScore !== null ? factors.sleepScore : "—"}
          </p>
        </div>
      </div>
    </div>
  );
};
