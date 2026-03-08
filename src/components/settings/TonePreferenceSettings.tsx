import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTonePreference, TonePreference } from "@/hooks/useTonePreference";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

const toneOptions: { value: TonePreference; label: string; description: string }[] = [
  {
    value: "balanced",
    label: "Balanced",
    description: "A blend of all styles that adapts naturally to context"
  },
  {
    value: "coach",
    label: "Coach",
    description: "Direct and motivating, focused on action and progress"
  },
  {
    value: "warm",
    label: "Warm",
    description: "Gentle and caring, emphasizing support and understanding"
  },
  {
    value: "supportive",
    label: "Supportive",
    description: "Encouraging and reassuring, focused on your wellbeing"
  },
  {
    value: "strategic",
    label: "Strategic",
    description: "Objective and thoughtful, focused on long term outcomes"
  }
];

export function TonePreferenceSettings() {
  const { preference, isLoading, updatePreference } = useTonePreference();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Communication Style</Label>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Choose how you prefer Yves to communicate with you. This adjusts the voice and style of recommendations while still adapting to context automatically.
      </p>

      <RadioGroup
        value={preference}
        onValueChange={(value) => updatePreference(value as TonePreference)}
        className="space-y-3"
      >
        {toneOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card/50 hover:bg-muted/30 cursor-pointer transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
          >
            <RadioGroupItem value={option.value} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground">
                {option.label}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {option.description}
              </p>
            </div>
          </label>
        ))}
      </RadioGroup>

      <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/50">
        Note: Training content will still use a coaching style, recovery content will remain warm, and goal planning will stay strategic. Your preference fine tunes the overall voice.
      </p>
    </div>
  );
}
