import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { sports: string[] };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const SPORT_OPTIONS = [
  { value: "running", label: "Running" },
  { value: "cycling", label: "Cycling" },
  { value: "swimming", label: "Swimming" },
  { value: "triathlon", label: "Triathlon" },
  { value: "gym", label: "Gym / Weights" },
  { value: "crossfit", label: "CrossFit" },
  { value: "football", label: "Football" },
  { value: "rugby", label: "Rugby" },
  { value: "basketball", label: "Basketball" },
  { value: "tennis", label: "Tennis" },
  { value: "hockey", label: "Hockey" },
  { value: "cricket", label: "Cricket" },
  { value: "boxing", label: "Boxing" },
  { value: "yoga", label: "Yoga / Pilates" },
  { value: "walking", label: "Walking" },
  { value: "golf", label: "Golf" },
  { value: "surfing", label: "Surfing" },
  { value: "dance", label: "Dance" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "other", label: "Other" },
];

export function OnboardingTrainingType({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="font-mono text-[9px] tracking-[0.4em] uppercase text-coldBlue/40">Training</p>
        <h2 className="font-display font-light text-3xl text-marble3">What Sports Do You Do?</h2>
        <p className="font-sans text-sm text-marble1/50 tracking-wide">Select all that apply (up to 5)</p>
      </div>

      <OnboardingChips
        options={SPORT_OPTIONS}
        value={data.sports}
        onChange={(v) => onUpdate({ sports: v as string[] })}
        multi
        maxSelections={5}
        columns={3}
        size="sm"
      />
    </div>
  );
}
