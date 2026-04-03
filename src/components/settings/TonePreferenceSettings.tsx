import { useTonePreference, TonePreference } from "@/hooks/useTonePreference";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const toneOptions: { value: TonePreference; label: string; icon: string; description: string }[] = [
  {
    value: "balanced",
    label: "Balanced",
    icon: "~",
    description: "Adapts naturally to context"
  },
  {
    value: "coach",
    label: "Coach",
    icon: "!",
    description: "Direct and motivating"
  },
  {
    value: "warm",
    label: "Warm",
    icon: "&",
    description: "Gentle and caring"
  },
  {
    value: "supportive",
    label: "Supportive",
    icon: "+",
    description: "Encouraging and reassuring"
  },
  {
    value: "strategic",
    label: "Strategic",
    icon: "#",
    description: "Objective and analytical"
  }
];

export function TonePreferenceSettings() {
  const { preference, isLoading, updatePreference } = useTonePreference();

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 w-full " />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        How should Yves talk to you? This shapes the voice across all recommendations, briefings, and chat.
      </p>

      <div className="grid grid-cols-5 gap-2">
        {toneOptions.map((option) => {
          const isSelected = preference === option.value;
          return (
            <button
              key={option.value}
              onClick={() => updatePreference(option.value)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3  border transition-all duration-200 text-center",
                "hover:bg-muted/40 cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/10 "
                  : "border-border/50 bg-card/30"
              )}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5">
                  <Check className="h-3 w-3 text-primary" />
                </div>
              )}
              <span className={cn(
                "text-lg font-mono leading-none",
                isSelected ? "text-primary" : "text-muted-foreground"
              )}>
                {option.icon}
              </span>
              <span className={cn(
                "text-[11px] font-medium leading-tight",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        {toneOptions.find(o => o.value === preference)?.description}
      </p>
    </div>
  );
}
