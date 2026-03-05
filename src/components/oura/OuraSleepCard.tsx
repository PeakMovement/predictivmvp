import { Moon, Clock, Zap, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface OuraSleepCardProps {
  score: number | null;
  totalSleep: number | null;
  deepSleep: number | null;
  remSleep: number | null;
  lightSleep: number | null;
  efficiency: number | null;
  isLoading?: boolean;
}

export const OuraSleepCard = ({
  score,
  totalSleep,
  deepSleep,
  remSleep,
  lightSleep,
  efficiency,
  isLoading = false,
}: OuraSleepCardProps) => {
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

  if (score === null && totalSleep === null) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Moon className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Sleep</h2>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-2">No sleep data available</p>
          <p className="text-sm text-muted-foreground">Sleep data will appear after your next night's rest</p>
        </div>
      </div>
    );
  }

  const getScoreColor = (value: number) => {
    if (value >= 85) return "text-blue-500";
    if (value >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (value: number) => {
    if (value >= 85) return "stroke-blue-500";
    if (value >= 70) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  const formatHours = (hours: number | null) => {
    if (hours === null) return "—";
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const circumference = 2 * Math.PI * 54;
  const scoreValue = score || 0;
  const strokeDashoffset = circumference - (scoreValue / 100) * circumference;

  const sleepStages = [
    {
      label: "Deep",
      value: deepSleep,
      color: "bg-indigo-500",
      hours: deepSleep,
      description: "Deep sleep is essential for physical recovery, immune function, and memory consolidation. Most deep sleep occurs in the first half of the night.",
      normalRange: "13-23% of total sleep"
    },
    {
      label: "REM",
      value: remSleep,
      color: "bg-purple-500",
      hours: remSleep,
      description: "REM (Rapid Eye Movement) sleep is crucial for emotional processing, creativity, and learning. Dreams occur during REM sleep.",
      normalRange: "20-25% of total sleep"
    },
    {
      label: "Light",
      value: lightSleep,
      color: "bg-blue-400",
      hours: lightSleep,
      description: "Light sleep helps with mental and physical restoration. It serves as a transition between wakefulness and deeper sleep stages.",
      normalRange: "50-60% of total sleep"
    },
  ];

  const totalStageHours = (deepSleep || 0) + (remSleep || 0) + (lightSleep || 0);

  return (
    <TooltipProvider>
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover-glow animate-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Moon className="w-5 h-5 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Sleep</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="font-semibold mb-1">Sleep Score (0-100)</p>
              <p className="text-sm">A comprehensive measure of sleep quality based on duration, efficiency, restfulness, and timing.</p>
              <p className="text-sm mt-2">
                <span className="text-green-500">85+</span>: Excellent |{" "}
                <span className="text-yellow-500">70-84</span>: Good |{" "}
                <span className="text-red-500">&lt;70</span>: Pay attention
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
        </div>
      )}

      <div className="space-y-4 mb-6">
        {totalSleep !== null && (
          <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Sleep</p>
                  <p className="text-lg font-semibold text-foreground">{formatHours(totalSleep)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {efficiency !== null && (
          <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Efficiency</p>
                  <p className="text-lg font-semibold text-foreground">{efficiency}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {totalStageHours > 0 && (
        <div className="pt-6 border-t border-glass-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Sleep Stages</h3>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {sleepStages.map((stage) => (
              <Tooltip key={stage.label}>
                <TooltipTrigger asChild>
                  <div className="text-center cursor-help p-2 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <p className="text-xs text-muted-foreground">{stage.label}</p>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{formatHours(stage.hours)}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalStageHours > 0 ? Math.round(((stage.hours || 0) / totalStageHours) * 100) : 0}%
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{stage.label} Sleep</p>
                  <p className="text-sm mb-2">{stage.description}</p>
                  <p className="text-xs text-muted-foreground">Normal range: {stage.normalRange}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="w-full h-4 bg-background/50 rounded-full overflow-hidden flex">
            {sleepStages.map((stage) => {
              const percentage = totalStageHours > 0 ? ((stage.hours || 0) / totalStageHours) * 100 : 0;
              return (
                <div
                  key={stage.label}
                  className={`${stage.color} h-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                  title={`${stage.label}: ${formatHours(stage.hours)}`}
                />
              );
            })}
          </div>
        </div>
      )}

        <div className="mt-6 pt-6 border-t border-glass-border">
          <p className="text-xs text-muted-foreground text-center">
            Sleep score measures the quality and restorative value of your rest
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
};
