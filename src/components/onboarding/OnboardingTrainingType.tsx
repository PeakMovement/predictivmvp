import { Dumbbell } from "lucide-react";
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
  { value: "physiotherapy", label: "Physiotherapy / Rehab" },
  { value: "other", label: "Other" },
];

export function OnboardingTrainingType({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Dumbbell className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">What Sports Do You Do?</h2>
        <p className="text-sm text-muted-foreground">Select all that apply (up to 5)</p>
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
