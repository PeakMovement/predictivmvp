import { Flame, TrendingUp, TrendingDown } from "lucide-react";
import { useAdherenceStreak } from "@/hooks/useAdherenceStreak";
import { cn } from "@/lib/utils";

/** Adherence streak + weekly recap — habit loop reinforcement. */
export function StreakRecapCard() {
  const { streak, thisWeekPct, lastWeekPct, deltaPct, hasData, isLoading } = useAdherenceStreak();

  if (isLoading) {
    return <div className="bg-glass rounded-md border border-glass-border p-6 animate-pulse"><div className="h-6 bg-muted/30 rounded w-1/3 mb-4" /><div className="h-12 bg-muted/30 rounded w-full" /></div>;
  }
  if (!hasData) return null;

  const up = (deltaPct ?? 0) >= 0;
  const DeltaIcon = up ? TrendingUp : TrendingDown;

  return (
    <div className="bg-glass rounded-md border border-glass-border p-4 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-12 h-12 rounded-md flex items-center justify-center border",
            streak > 0 ? "text-amber bg-amber/15 border-amber/30" : "text-muted-foreground bg-muted/15 border-muted/30",
          )}>
            <Flame size={24} />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-foreground font-display">{streak}</span>
              <span className="text-sm text-muted-foreground">day{streak === 1 ? "" : "s"} on plan</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {streak > 0 ? "Keep the streak alive — log today's plan." : "Hit 70%+ adherence to start a streak."}
            </p>
          </div>
        </div>

        {thisWeekPct !== null && (
          <div className="text-right shrink-0">
            <div className="text-xl font-semibold text-foreground font-display">{thisWeekPct}%</div>
            <p className="text-xs text-muted-foreground">this week</p>
            {deltaPct !== null && lastWeekPct !== null && (
              <div className={cn("flex items-center justify-end gap-1 text-xs mt-0.5", up ? "text-bioGreen" : "text-red-400")}>
                <DeltaIcon size={13} />
                {Math.abs(deltaPct)}% vs last week
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
