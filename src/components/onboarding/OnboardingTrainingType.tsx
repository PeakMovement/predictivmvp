import { Dumbbell } from "lucide-react";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { trainingType: string };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const TRAINING_OPTIONS = [
  {
    value: "endurance",
    label: "Endurance",
    description: "Running, cycling, swimming, triathlon, rowing, walking",
  },
  {
    value: "strength",
    label: "Strength",
    description: "Gym, CrossFit, powerlifting, boxing, calisthenics",
  },
  {
    value: "team",
    label: "Team Sport",
    description: "Football, rugby, basketball, tennis, hockey, cricket",
  },
  {
    value: "mindbody",
    label: "Mind & Body",
    description: "Yoga, Pilates, walking, golf, surfing, dance",
  },
  {
    value: "rehab",
    label: "Rehab / Physio",
    description: "Physiotherapy-led recovery. Peak Movement primary.",
  },
];

export function OnboardingTrainingType({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Dumbbell className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">How Do You Train?</h2>
        <p className="text-sm text-muted-foreground">Pick the category that best describes your main activity</p>
      </div>

      <OnboardingChips
        options={TRAINING_OPTIONS}
        value={data.trainingType}
        onChange={(v) => onUpdate({ trainingType: v as string })}
        columns={1}
        size="md"
      />
    </div>
  );
}
