import { Battery, Heart, Activity, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface OuraReadinessCardProps {
  score: number | null;
  restingHR: number | null;
  hrv: number | null;
  isLoading?: boolean;
}

export const OuraReadinessCard = ({
  score,
  restingHR,
  hrv,
  isLoading = false,
}: OuraReadinessCardProps) => {
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
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  if (score === null) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
            <Battery className="w-5 h-5 text-teal-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Readiness</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No readiness data available</p>
          <p className="text-sm text-muted-foreground">Sync your Ōura Ring to see your readiness score</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (value: number) => {
    if (value >= 85) return "text-teal-500";
    if (value >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (value: number) => {
    if (value >= 85) return "stroke-teal-500";
    if (value >= 70) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  const getScoreLabel = (value: number) => {
    if (value >= 85) return "Optimal";
    if (value >= 70) return "Good";
    return "Pay Attention";
  };

  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover-glow animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
          <Battery className="w-5 h-5 text-teal-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Readiness</h2>
      </div>

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
              className={getScoreBgColor(score)}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 1s ease-in-out",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
          </div>
        </div>
        <p className={`text-sm font-medium ${getScoreColor(score)}`}>
          {getScoreLabel(score)}
        </p>
      </div>

      <div className="space-y-4">
        {restingHR !== null && (
          <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-red-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Resting Heart Rate</p>
                  <p className="text-lg font-semibold text-foreground">{restingHR} bpm</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {hrv !== null && (
          <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">HRV Balance</p>
                  <p className="text-lg font-semibold text-foreground">{hrv} ms</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <div>
                <p className="text-sm text-muted-foreground">Recovery Status</p>
                <p className="text-lg font-semibold text-foreground">
                  {score >= 85 ? "Optimal" : score >= 70 ? "Good" : "Recovering"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-glass-border">
        <p className="text-xs text-muted-foreground text-center">
          Readiness indicates how prepared your body is for the day
        </p>
      </div>
    </div>
  );
};
