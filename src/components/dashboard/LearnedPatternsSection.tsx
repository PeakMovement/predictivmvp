import { useState } from 'react';
import { Lightbulb, ChevronDown, Activity, Heart } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useObservedPatterns, ObservedPattern } from '@/hooks/useObservedPatterns';
import { cn } from '@/lib/utils';

interface LearnedPatternsProps {
  className?: string;
}

const toneStyles = {
  coach: {
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    icon: 'text-primary',
    text: 'text-primary/90',
  },
  warm: {
    bg: 'bg-orange-500/5',
    border: 'border-orange-500/20',
    icon: 'text-orange-600 dark:text-orange-400',
    text: 'text-orange-800 dark:text-orange-300',
  },
};

const categoryIcons = {
  training: Activity,
  recovery: Heart,
  sleep: Heart,
  stress: Heart,
  symptoms: Heart,
};

function PatternItem({ pattern }: { pattern: ObservedPattern }) {
  const styles = toneStyles[pattern.tone];
  const Icon = categoryIcons[pattern.category];

  return (
    <div className={cn('rounded-lg p-3 border', styles.bg, styles.border)}>
      <div className="flex items-start gap-2.5">
        <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', styles.icon)} />
        <p className={cn('text-sm leading-relaxed', styles.text)}>
          {pattern.observation}
        </p>
      </div>
    </div>
  );
}

export function LearnedPatternsSection({ className }: LearnedPatternsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { patterns, isLoading, hasPatterns } = useObservedPatterns();

  if (isLoading) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="rounded-lg border border-border bg-card/50">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors rounded-lg">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="shrink-0 text-muted-foreground">
                <Lightbulb className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">
                  What we have learned about you
                </div>
                {!isOpen && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {hasPatterns
                      ? `${patterns.length} pattern${patterns.length > 1 ? 's' : ''} observed over time`
                      : "Building your personal patterns..."}
                  </p>
                )}
              </div>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 space-y-2.5">
            {hasPatterns ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  These observations are based on your data over time. They reflect tendencies, not certainties, and help us personalize your guidance.
                </p>
                {patterns.map((pattern) => (
                  <PatternItem key={pattern.id} pattern={pattern} />
                ))}
              </>
            ) : (
              <div className="py-4 text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  We're learning about your unique patterns
                </p>
                <p className="text-xs text-muted-foreground">
                  Keep syncing your data and we'll identify personalized insights within a few days. Patterns rotate to stay fresh and relevant.
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
