import { Moon, Brain, MessageCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { OnboardingChips } from "./OnboardingChips";

interface Props {
  data: { stressLevel: number; sleepQuality: string; compliance: string };
  onUpdate: (patch: Partial<Props["data"]>) => void;
}

const SLEEP_OPTIONS = [
  {
    value: "solid",
    label: "Solid",
    description: "7-9 hrs, wake rested",
  },
  {
    value: "variable",
    label: "Variable",
    description: "Some good, some rough",
  },
  {
    value: "short",
    label: "Chronically Short",
    description: "Under 6.5 hrs regularly",
  },
  {
    value: "disrupted",
    label: "Disrupted",
    description: "Shift work, kids, irregular",
  },
];

const COMPLIANCE_OPTIONS = [
  {
    value: "high",
    label: "High",
    description: "4-6 questions daily — unlocks deepest insights",
  },
  {
    value: "medium",
    label: "Medium",
    description: "1-3 questions most days — good balance",
  },
  {
    value: "low",
    label: "Low",
    description: "Data only, minimal questions — passive mode",
  },
];

const stressLabel = (v: number) =>
  v <= 3 ? "Low stress" : v <= 6 ? "Medium stress" : "High stress";

export function OnboardingLifestyle({ data, onUpdate }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Brain className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Daily Life</h2>
        <p className="text-sm text-muted-foreground">Stress, sleep, and how much you want Yves involved</p>
      </div>

      {/* Stress slider */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">
            Life Stress Level: <span className="text-primary">{data.stressLevel}/10</span>
            <span className="text-xs text-muted-foreground ml-2">({stressLabel(data.stressLevel)})</span>
          </Label>
        </div>
        <Slider
          value={[data.stressLevel]}
          onValueChange={([v]) => onUpdate({ stressLevel: v })}
          min={1}
          max={10}
          step={1}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>

      {/* Sleep quality */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Moon className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">How's Your Sleep?</Label>
        </div>
        <OnboardingChips
          options={SLEEP_OPTIONS}
          value={data.sleepQuality}
          onChange={(v) => onUpdate({ sleepQuality: v as string })}
          columns={2}
          size="sm"
        />
      </div>

      {/* Compliance / check-in willingness */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-medium">Yves Check-in Willingness</Label>
        </div>
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
