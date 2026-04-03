import { Slider } from "@/components/ui/slider";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { stressLevel: number; sleepQuality: string; compliance: string };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const SLEEP_OPTIONS = [
  { value: "solid", label: "Solid", description: "7-9 hrs, wake rested" },
  { value: "variable", label: "Variable", description: "Some good, some rough" },
  { value: "short", label: "Chronically Short", description: "Under 6.5 hrs regularly" },
  { value: "disrupted", label: "Disrupted", description: "Shift work, kids, irregular" },
];

const COMPLIANCE_OPTIONS = [
  { value: "high", label: "High", description: "4-6 questions daily — deepest insights" },
  { value: "medium", label: "Balanced", description: "1-3 questions most days" },
  { value: "low", label: "Passive", description: "Data only, minimal questions" },
];

const stressLabel = (v: number) =>
  v <= 3 ? "Low" : v <= 6 ? "Medium" : "High";

export function OnboardingLifestyle({ data, onUpdate }: Props) {
  return (
    <div className="space-y-7">
      <div className="text-center space-y-2">
        <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-coldBlue/40">Lifestyle</p>
        <h2 className="font-display font-light text-3xl text-marble3">Daily Life</h2>
        <p className="font-sans text-sm text-marble1/50 tracking-wide">Stress, sleep, and how involved Yves should be</p>
      </div>

      {/* Stress slider */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between">
          <label className="font-mono text-[9px] tracking-[0.3em] uppercase text-marble1/40">
            Life Stress Level
          </label>
          <span className="font-mono text-sm text-coldBlue tracking-wider">
            {data.stressLevel}/10
            <span className="text-[9px] text-marble1/30 ml-2">{stressLabel(data.stressLevel)}</span>
          </span>
        </div>
        <Slider
          value={[data.stressLevel]}
          onValueChange={([v]) => onUpdate({ stressLevel: v })}
          min={1}
          max={10}
          step={1}
        />
        <div className="flex justify-between font-mono text-[8px] tracking-[0.2em] uppercase text-marble1/20">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>

      {/* Sleep quality */}
      <div className="space-y-2">
        <label className="font-mono text-[9px] tracking-[0.3em] uppercase text-marble1/40">Sleep Quality</label>
        <OnboardingChips
          options={SLEEP_OPTIONS}
          value={data.sleepQuality}
          onChange={(v) => onUpdate({ sleepQuality: v as string })}
          columns={2}
          size="sm"
        />
      </div>

      {/* Compliance */}
      <div className="space-y-2">
        <label className="font-mono text-[9px] tracking-[0.3em] uppercase text-marble1/40">Yves Engagement</label>
        <OnboardingChips
          options={COMPLIANCE_OPTIONS}
          value={data.compliance}
          onChange={(v) => onUpdate({ compliance: v as string })}
          columns={1}
          size="sm"
        />
      </div>
    </div>
  );
}
