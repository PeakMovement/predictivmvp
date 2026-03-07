import { TrendingUp } from 'lucide-react';
import { DataMaturityTier } from '@/hooks/useDataMaturity';
import { cn } from '@/lib/utils';

interface BaselineBannerProps {
  tier: DataMaturityTier;
  daysWithData: number;
  className?: string;
}

/**
 * Subtle inline banner shown inside DailyBriefingCard and YvesRecommendationsCard
 * when the user's baseline is still building (none or early tier only).
 */
export function BaselineBanner({ tier, daysWithData, className }: BaselineBannerProps) {
  if (tier !== 'none' && tier !== 'early') return null;

  const message =
    tier === 'none'
      ? "Yves is working with general patterns — sync a wearable to start personalising."
      : `Yves has ${daysWithData} day${daysWithData === 1 ? '' : 's'} of your data — recommendations become more personalised as your baseline grows.`;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2',
        className
      )}
    >
      <TrendingUp className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      <p className="text-xs text-muted-foreground leading-snug">{message}</p>
    </div>
  );
}
