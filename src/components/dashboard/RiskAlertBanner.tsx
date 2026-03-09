import { useEffect, useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// Matches the shape written by RiskScoreCard's upsert
type ComponentScores = {
  acwr: number;
  fatigue: number;
  hrv: number;
  sleep: number;
};

const DRIVER_LABELS: Record<keyof ComponentScores, string> = {
  acwr: "Training load ratio (ACWR) is elevated — reduce load this week",
  fatigue: "Accumulated fatigue and training monotony are high",
  hrv: "HRV has dropped significantly from your personal baseline",
  sleep: "Sleep quality is below your normal range",
};

function topDriverMessage(scores: ComponentScores): string {
  const entries = (Object.entries(scores) as [keyof ComponentScores, number][]);
  const top = entries.sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] === 0) return "Multiple factors are contributing to your risk score";
  return DRIVER_LABELS[top[0]];
}

export function RiskAlertBanner() {
  const [score, setScore] = useState<number | null>(null);
  const [driverMsg, setDriverMsg] = useState("");
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("riskBannerDismissed") === "true",
  );

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("risk_score_history")
        .select("score, component_scores")
        .eq("user_id", user.id)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return;
      setScore(data.score);
      if (data.component_scores) {
        setDriverMsg(topDriverMessage(data.component_scores as ComponentScores));
      }
    };
    load();
  }, []);

  const dismiss = () => {
    sessionStorage.setItem("riskBannerDismissed", "true");
    setDismissed(true);
  };

  if (dismissed || score === null || score < 34) return null;

  const isHigh = score >= 67;

  return (
    <div className={cn(
      "mb-6 rounded-xl border px-4 py-3 flex items-start gap-3",
      isHigh
        ? "bg-red-500/10 border-red-500/40"
        : "bg-yellow-500/10 border-yellow-500/40",
    )}>
      <AlertTriangle className={cn(
        "h-4 w-4 mt-0.5 shrink-0",
        isHigh ? "text-red-400" : "text-yellow-400",
      )} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {isHigh ? "High injury risk detected" : "Moderate injury risk"}
          <span className={cn(
            "ml-2 text-xs font-bold",
            isHigh ? "text-red-400" : "text-yellow-400",
          )}>
            {score} / 100
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{driverMsg}</p>
        {isHigh && (
          <button
            onClick={() =>
              window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "alert-history" }))
            }
            className="flex items-center gap-0.5 mt-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors"
          >
            View Details <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
