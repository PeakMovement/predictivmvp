import { useEffect, useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { generateBriefing } from "@/api/dailyBriefing";

interface OnboardingData {
  firstName: string;
  wearables: string[];
  sports: string[];
  healthGoals: string[];
  injuryHistory: string;
  injuryDescription: string;
  stressLevel: number;
  sleepQuality: string;
  compliance: string;
}

interface Props {
  data: OnboardingData;
}

const LABELS: Record<string, string> = {
  oura: "Oura Ring", garmin: "Garmin", polar: "Polar", none: "No wearable",
  injury_prevention: "Injury Prevention", performance: "Performance", recovery: "Recovery",
  stress: "Stress Management", longevity: "Longevity", rehab: "Rehab / Healing",
  solid: "Solid sleep", variable: "Variable", short: "Chronically short", disrupted: "Disrupted",
  high: "High engagement", medium: "Balanced", low: "Passive",
  "none": "No injuries", overuse: "Overuse history", acute: "Acute history",
  current: "Current injury", multiple: "Multiple / recurring",
};

const label = (v: string) => LABELS[v] || v.charAt(0).toUpperCase() + v.slice(1);

export function OnboardingComplete({ data }: Props) {
  const [generating, setGenerating] = useState(true);
  const [briefingReady, setBriefingReady] = useState(false);

  useEffect(() => {
    generateBriefing("full")
      .then((r) => setBriefingReady(r.success))
      .finally(() => setGenerating(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">
          You're ready{data.firstName ? `, ${data.firstName}` : ""}!
        </h2>
        <p className="text-sm text-muted-foreground">Here's your profile at a glance</p>
      </div>

      <div className="bg-card/50 border border-border/50 rounded-xl p-4 space-y-3">
        <SummaryRow label="Wearables" value={data.wearables.map(label).join(", ") || "—"} />
        <SummaryRow label="Sports" value={data.sports.map(label).join(", ") || "—"} />
        <SummaryRow label="Goals" value={data.healthGoals.map(label).join(", ") || "—"} />
        <SummaryRow label="Injury" value={label(data.injuryHistory)} />
        <SummaryRow label="Stress" value={`${data.stressLevel}/10`} />
        <SummaryRow label="Sleep" value={label(data.sleepQuality)} />
        <SummaryRow label="Engagement" value={label(data.compliance)} />
      </div>

      <div className="text-center">
        {generating ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating your first briefing…
          </div>
        ) : briefingReady ? (
          <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400 font-medium">
            <Check className="h-4 w-4" />
            Your first briefing is ready on the dashboard.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your dashboard will generate a briefing once your data syncs.
          </p>
        )}
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-4">
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Your dashboard updates automatically as data syncs</li>
          <li>• Check back daily for fresh insights from Yves</li>
          <li>• Connect your wearable in Settings if you haven't yet</li>
        </ul>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
