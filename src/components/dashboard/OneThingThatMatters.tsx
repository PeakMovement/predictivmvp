import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface OneThingThatMattersProps {
  focus: string | null;
  className?: string;
}

type FocusCategory = 'training' | 'wellbeing' | 'strategic';

function categorizeFocus(focus: string): FocusCategory {
  const trainingKeywords = [
    'workout', 'exercise', 'run', 'training', 'gym', 'strength', 'cardio',
    'movement', 'walk', 'stretch', 'active', 'intensity', 'session', 'reps',
    'sets', 'miles', 'steps', 'push', 'lift', 'sprint', 'endurance'
  ];
  
  const wellbeingKeywords = [
    'rest', 'sleep', 'recover', 'relax', 'stress', 'pain', 'fatigue',
    'breathe', 'calm', 'ease', 'gentle', 'comfort', 'hydrate', 'nap',
    'meditation', 'mindful', 'self care', 'wellbeing', 'healing', 'sore'
  ];

  const focusLower = focus.toLowerCase();
  
  const hasTraining = trainingKeywords.some(kw => focusLower.includes(kw));
  const hasWellbeing = wellbeingKeywords.some(kw => focusLower.includes(kw));
  
  if (hasWellbeing && !hasTraining) {
    return 'wellbeing';
  }
  if (hasTraining && !hasWellbeing) {
    return 'training';
  }
  if (hasTraining && hasWellbeing) {
    // If both, check if it leans recovery
    const recoveryBias = ['rest', 'recover', 'easy', 'gentle', 'light'].some(
      kw => focusLower.includes(kw)
    );
    return recoveryBias ? 'wellbeing' : 'training';
  }
  
  return 'strategic';
}

function getToneStyles(category: FocusCategory) {
  switch (category) {
    case 'training':
      return {
        containerClass: 'bg-primary/10 border-primary/30',
        iconClass: 'text-primary',
        textClass: 'text-foreground',
        label: 'Training Focus'
      };
    case 'wellbeing':
      return {
        containerClass: 'bg-emerald-500/10 border-emerald-500/30',
        iconClass: 'text-emerald-500',
        textClass: 'text-foreground',
        label: 'Recovery Focus'
      };
    case 'strategic':
      return {
        containerClass: 'bg-blue-500/10 border-blue-500/30',
        iconClass: 'text-blue-500',
        textClass: 'text-foreground',
        label: 'Strategic Focus'
      };
  }
}

export function OneThingThatMatters({ focus, className }: OneThingThatMattersProps) {
  if (!focus) return null;
  
  const category = categorizeFocus(focus);
  const styles = getToneStyles(category);
  
  // Clean the focus text - remove any leading emoji or "Today's Focus:" prefix
  const cleanFocus = focus
    .replace(/^🎯\s*/, '')
    .replace(/^Today's Focus:\s*/i, '')
    .trim();
  
  return (
    <div className={cn("pt-4 border-t border-border/50", className)}>
      <div className={cn(
        "rounded-lg border p-4",
        styles.containerClass
      )}>
        <div className="flex items-start gap-3">
          <Target className={cn("h-5 w-5 mt-0.5 shrink-0", styles.iconClass)} />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground flex items-center">
              One thing that matters today
              <InfoTooltip content="Your single most important focus for today based on all available data" />
            </h4>
            <p className={cn("text-sm leading-relaxed", styles.textClass)}>
              {cleanFocus}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
