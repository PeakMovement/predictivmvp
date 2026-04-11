import { cn } from '@/lib/utils';
import { InsightTone } from '@/hooks/usePersonalizedInsights';

interface WhyThisMattersProps {
  explanation: string;
  tone: InsightTone;
  className?: string;
}

const toneStyles: Record<InsightTone, { bg: string; text: string; label: string }> = {
  coach: {
    bg: 'bg-primary/5',
    text: 'text-primary/90',
    label: 'text-primary/70',
  },
  warm: {
    bg: 'bg-amber/5',
    text: 'text-orange-800 dark:text-orange-300',
    label: 'text-orange-600/80 dark:text-orange-400/70',
  },
  strategic: {
    bg: 'bg-blue-500/5',
    text: 'text-blue-800 dark:text-blue-300',
    label: 'text-blue-600/80 dark:text-blue-400/70',
  },
};

export function WhyThisMatters({ explanation, tone, className }: WhyThisMattersProps) {
  const styles = toneStyles[tone];
  
  return (
    <div className={cn('mt-2 rounded-md p-2.5', styles.bg, className)}>
      <p className="font-mono text-[8px] tracking-[3px] uppercase text-coldBlue/50 mb-1">
        Data Basis
      </p>
      <p className={cn('text-xs leading-relaxed', styles.text)}>
        {explanation}
      </p>
    </div>
  );
}
