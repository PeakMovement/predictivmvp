import { ShieldAlert } from "lucide-react";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { injuryHistory: string };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const INJURY_OPTIONS = [
  {
    value: "none",
    label: "No Significant Injuries",
    description: "Clean slate — allows aggressive load monitoring",
  },
  {
    value: "overuse",
    label: "Overuse History",
    description: "Tendon issues, shin splints, repetitive strain",
  },
  {
    value: "acute",
    label: "Acute Injuries",
    description: "Tears, fractures, or surgery in the past",
  },
  {
    value: "current",
    label: "Currently Managing an Injury",
    description: "Active rehab or recovery in progress",
  },
  {
    value: "multiple",
    label: "Multiple / Recurring",
    description: "Several past or recurring injury patterns",
  },
];

export function OnboardingInjuryQ({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Injury History</h2>
        <p className="text-sm text-muted-foreground">This helps Yves calibrate safety thresholds and load advice</p>
      </div>

      <OnboardingChips
        options={INJURY_OPTIONS}
        value={data.injuryHistory}
        onChange={(v) => onUpdate({ injuryHistory: v as string })}
        columns={1}
        size="md"
      />

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-xs text-blue-600 dark:text-blue-400">
          This is private — it's only used to keep AI recommendations safe.
        </p>
      </div>
    </div>
  );
}
