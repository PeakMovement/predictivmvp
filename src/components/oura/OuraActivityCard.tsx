import { Zap, Footprints, Flame, Info, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNowStrict } from "date-fns";

const STALE_HOURS = 24;

interface OuraActivityCardProps {
  score: number | null;
  steps: number | null;
  activeCalories: number | null;
  totalCalories: number | null;
  isLoading?: boolean;
  lastSyncedAt?: string | null;
}

export const OuraActivityCard = ({
  score,
  steps,
  activeCalories,
  totalCalories,
  isLoading = false,
  lastSyncedAt,
}: OuraActivityCardProps) => {
  const lastSyncDate = lastSyncedAt ? new Date(lastSyncedAt) : null;
  const hoursSinceSync = lastSyncDate ? (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60) : null;
  const isStale = hoursSinceSync !== null && hoursSinceSync > STALE_HOURS;
  if (isLoading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="flex flex-col items-center mb-6">
          <Skeleton className="h-32 w-32 rounded-full mb-4" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  if (score === null && steps === null) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Activity</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No activity data available</p>
          <p className="text-sm text-muted-foreground">Activity data will update throughout the day</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (value: number) => {
    if (value >= 85) return "text-orange-500";
    if (value >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (value: number) => {
    if (value >= 85) return "stroke-orange-500";
    if (value >= 70) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  const getActivityLevel = (value: number) => {
    if (value >= 85) return "Excellent";
    if (value >= 70) return "Good";
    return "Stay Active";
  };

  const circumference = 2 * Math.PI * 54;
  const scoreValue = score || 0;
  const strokeDashoffset = circumference - (scoreValue / 100) * circumference;

  return (
    <TooltipProvider>
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover-glow animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Activity</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">Activity Score (0-100)</p>
              <p className="text-sm">Measures your daily physical activity, including steps, calories, and movement intensity.</p>
              <p className="text-sm mt-2">
                <span className="text-green-500">85+</span>: Very active |{" "}
                <span className="text-yellow-500">70-84</span>: Active |{" "}
                <span className="text-red-500">&lt;70</span>: Increase activity
              </p>
            </TooltipContent>
          </Tooltip>
        </div>

      {score !== null && (
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-36 h-36 mb-4">
            <svg className="transform -rotate-90 w-36 h-36">
              <circle
                cx="72"
                cy="72"
                r="54"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="72"
                cy="72"
                r="54"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className={getScoreBgColor(scoreValue)}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s ease-in-out",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(scoreValue)}`}>
                {scoreValue}
              </span>
            </div>
          </div>
          <p className={`text-sm font-medium ${getScoreColor(scoreValue)}`}>
            {getActivityLevel(scoreValue)}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {steps !== null && (
          <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Footprints className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Steps</p>
                  <p className="text-lg font-semibold text-foreground">
                    {steps.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeCalories !== null && (
          <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Active Calories</p>
                  <p className="text-lg font-semibold text-foreground">
                    {activeCalories} kcal
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {totalCalories !== null && (
          <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Calories</p>
                  <p className="text-lg font-semibold text-foreground">
                    {totalCalories} kcal
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

        <div className="mt-6 pt-6 border-t border-glass-border">
          {lastSyncDate ? (
            <div className={`flex items-center justify-center gap-1.5 text-xs ${isStale ? "text-amber-500" : "text-muted-foreground"}`}>
              {isStale && <AlertTriangle className="h-3 w-3 shrink-0" />}
              <span>
                {isStale
                  ? `Data may be out of date — synced ${formatDistanceToNowStrict(lastSyncDate)} ago`
                  : `Synced ${formatDistanceToNowStrict(lastSyncDate)} ago`}
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Activity score measures your daily movement and training load
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
