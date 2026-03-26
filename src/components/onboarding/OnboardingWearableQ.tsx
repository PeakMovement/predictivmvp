import { Watch } from "lucide-react";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { wearables: string[] };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const WEARABLE_OPTIONS = [
  {
    value: "oura",
    label: "Oura Ring",
    description: "HRV, temp, sleep efficiency, deep sleep",
  },
  {
    value: "garmin",
    label: "Garmin Watch",
    description: "GPS load, ACWR, Firstbeat metrics",
  },
  {
    value: "polar",
    label: "Polar Watch",
    description: "Orthostatic test, muscle load, ANS charge",
  },
  {
    value: "none",
    label: "No Wearable",
    description: "Yves check-ins only — connect later",
  },
];

export function OnboardingWearableQ({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Watch className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Your Wearable</h2>
        <p className="text-sm text-muted-foreground">Select all devices you use. This determines which health formulas we can run.</p>
      </div>

      <OnboardingChips
        options={WEARABLE_OPTIONS}
        value={data.wearables}
        onChange={(v) => onUpdate({ wearables: v as string[] })}
        multi
        exclusiveValue="none"
        columns={1}
        size="lg"
      />

      <p className="text-[11px] text-muted-foreground/70 text-center">
        You'll connect your devices after onboarding in Settings.
      </p>
    </div>
  );
}
