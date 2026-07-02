import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { wearables: string[] };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const WEARABLE_OPTIONS = [
  { value: "oura", label: "Oura Ring", description: "HRV, temp, sleep efficiency, deep sleep" },
  { value: "garmin", label: "Garmin Watch", description: "GPS load, ACWR, Firstbeat metrics" },
  { value: "polar", label: "Polar Watch", description: "Orthostatic test, muscle load, ANS charge" },
  { value: "none", label: "No Wearable", description: "Yves check-ins only" },
];

export function OnboardingWearableQ({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40">Devices</p>
        <h2 className="font-display font-light text-3xl text-foreground">Your Wearable</h2>
        <p className="font-sans text-sm text-muted-foreground tracking-wide">Select all devices you use. This determines which formulas activate.</p>
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

      <p className="font-mono text-[11px] tracking-[0.04em] uppercase text-muted-foreground/50 text-center">
        Connect your device after onboarding in Settings.
      </p>
    </div>
  );
}
