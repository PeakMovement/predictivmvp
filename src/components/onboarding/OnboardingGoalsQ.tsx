import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { healthGoals: string[] };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const GOAL_OPTIONS = [
  { value: "injury_prevention", label: "Injury Prevention", description: "Stay ahead of overuse and training risks" },
  { value: "performance", label: "Performance", description: "Optimise load, adaptation, and peak output" },
  { value: "recovery", label: "Better Recovery", description: "Sleep quality, HRV trends, and restoration" },
  { value: "stress", label: "Stress Management", description: "Track and reduce psychosocial load" },
  { value: "longevity", label: "Longevity", description: "Long-term health and sustainable wellness" },
  { value: "rehab", label: "Rehab / Healing", description: "Guided return from injury or surgery" },
];

export function OnboardingGoalsQ({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-coldBlue/40">Objectives</p>
        <h2 className="font-display font-light text-3xl text-foreground">Health Goals</h2>
        <p className="font-sans text-sm text-muted-foreground tracking-wide">
          Pick up to <span className="text-coldBlue font-medium">2</span> that matter most
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

      <p className="font-mono text-[11px] tracking-[0.04em] uppercase text-muted-foreground/50 text-center">
        These determine which Life Formulas Yves prioritises.
      </p>
    </div>
  );
}
