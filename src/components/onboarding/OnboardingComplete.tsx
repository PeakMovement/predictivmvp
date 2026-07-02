import { useEffect, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { generateBriefing } from "@/api/dailyBriefing";

interface OnboardingData {
  firstName: string;
  wearables: string[];
  preferredActivities: string[];
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
  solid: "Solid", variable: "Variable", short: "Chronically short", disrupted: "Disrupted",
  high: "High", medium: "Balanced", low: "Passive",
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
        <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40">Complete</p>
        <h2 className="font-display font-light text-3xl text-foreground">
          {data.firstName ? `Ready, ${data.firstName}.` : "Ready."}
        </h2>
        <p className="font-sans text-sm text-muted-foreground tracking-wide">Your profile at a glance</p>
      </div>

      {/* Summary */}
      <div className="border border-border divide-y divide-line">
        <SummaryRow label="Wearables" value={data.wearables.map(label).join(", ") || "—"} />
        <SummaryRow label="Activities" value={data.preferredActivities.map(label).join(", ") || "—"} />
        <SummaryRow label="Goals" value={data.healthGoals.map(label).join(", ") || "—"} />
        <SummaryRow label="Injury" value={label(data.injuryHistory)} />
        <SummaryRow label="Stress" value={`${data.stressLevel}/10`} />
        <SummaryRow label="Sleep" value={label(data.sleepQuality)} />
        <SummaryRow label="Engagement" value={label(data.compliance)} />
      </div>

      {/* Briefing status */}
      <div className="text-center">
        {generating ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-coldBlue/50" />
            <span className="font-mono text-[12px] tracking-wider text-muted-foreground">Generating first briefing...</span>
          </div>
        ) : briefingReady ? (
          <div className="flex items-center justify-center gap-2">
            <Check className="h-3.5 w-3.5 text-bioGreen" />
            <span className="font-mono text-[12px] tracking-wider text-bioGreen/80">Briefing ready on dashboard.</span>
          </div>
        ) : (
          <p className="font-mono text-[12px] tracking-wider text-muted-foreground/60">
            Dashboard will generate a briefing once data syncs.
          </p>
        )}
      </div>

      <div className="border border-border p-4">
        <ul className="font-sans text-xs text-muted-foreground tracking-wide space-y-1.5 leading-relaxed">
          <li>Dashboard updates automatically as data syncs</li>
          <li>Check back daily for fresh insights from Yves</li>
          <li>Connect your wearable in Settings</li>
        </ul>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center px-4 py-3">
      <span className="font-mono text-[11px] tracking-[0.04em] uppercase text-muted-foreground/70">{label}</span>
      <span className="font-sans text-sm text-foreground text-right max-w-[60%] tracking-wide">{value}</span>
    </div>
  );
}
