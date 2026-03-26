import { Target } from "lucide-react";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { healthGoals: string[] };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const GOAL_OPTIONS = [
  {
    value: "injury_prevention",
    label: "Injury Prevention",
    description: "Stay ahead of overuse and training risks",
  },
  {
    value: "performance",
    label: "Performance",
    description: "Optimise load, adaptation, and peak output",
  },
  {
    value: "recovery",
    label: "Better Recovery",
    description: "Sleep quality, HRV trends, and restoration",
  },
  {
    value: "stress",
    label: "Stress Management",
    description: "Track and reduce psychosocial load",
  },
  {
    value: "longevity",
    label: "Longevity",
    description: "Long-term health and sustainable wellness",
  },
  {
    value: "rehab",
    label: "Rehab / Healing",
    description: "Guided return from injury or surgery",
  },
];

export function OnboardingGoalsQ({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Target className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Health Goals</h2>
        <p className="text-sm text-muted-foreground">
          Pick up to <strong>2</strong> that matter most to you
        </p>
      </div>

      <OnboardingChips
        options={GOAL_OPTIONS}
        value={data.healthGoals}
        onChange={(v) => onUpdate({ healthGoals: v as string[] })}
        multi
        maxSelections={2}
        columns={1}
        size="md"
      />

      <p className="text-[11px] text-muted-foreground/70 text-center">
        These determine which Life Formulas Yves prioritises for you.
      </p>
    </div>
  );
}
