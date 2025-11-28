import { Moon, Clock, TrendingUp } from "lucide-react";
import { useWearableMetrics } from "@/hooks/useWearableMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export const SleepMetricsCard = () => {
  const { metrics, isLoading } = useWearableMetrics();

  if (isLoading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (!metrics || !metrics.hasSleepData) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Moon className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">Sleep Stages</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No sleep data available</p>
          <p className="text-sm text-muted-foreground mt-2">Sync your Ōura app to see sleep data</p>
        </div>
      </div>
    );
  }

  const formatTime = (timeString: string) => {
    if (!timeString) return "–";
    try {
      return format(new Date(timeString), "h:mm a");
    } catch {
      return "–";
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const totalSleepMinutes = metrics.sleepDuration;
  const sleepStages = [
    {
      name: "Light Sleep",
      minutes: metrics.lightSleepMinutes,
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      percentage: totalSleepMinutes > 0 ? (metrics.lightSleepMinutes / totalSleepMinutes) * 100 : 0,
    },
    {
      name: "Deep Sleep",
      minutes: metrics.deepSleepMinutes,
      color: "text-indigo-600",
      bgColor: "bg-indigo-600/20",
      percentage: totalSleepMinutes > 0 ? (metrics.deepSleepMinutes / totalSleepMinutes) * 100 : 0,
    },
    {
      name: "REM Sleep",
      minutes: metrics.remSleepMinutes,
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      percentage: totalSleepMinutes > 0 ? (metrics.remSleepMinutes / totalSleepMinutes) * 100 : 0,
    },
    {
      name: "Awake",
      minutes: metrics.awakeSleepMinutes,
      color: "text-gray-400",
      bgColor: "bg-gray-500/20",
      percentage: totalSleepMinutes > 0 ? (metrics.awakeSleepMinutes / totalSleepMinutes) * 100 : 0,
    },
  ];

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover-glow animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
          <Moon className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Sleep Stages</h2>
      </div>

      {/* Primary Sleep Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4 text-center">
          <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground mb-1">
            {formatDuration(totalSleepMinutes)}
          </p>
          <p className="text-xs text-muted-foreground">Total Sleep</p>
        </div>

        <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground mb-1">{metrics.sleepEfficiency}%</p>
          <p className="text-xs text-muted-foreground">Efficiency</p>
        </div>

        <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4 text-center">
          <Moon className="w-5 h-5 text-purple-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-foreground mb-1">
            {formatTime(metrics.sleepStartTime)}
          </p>
          <p className="text-xs text-muted-foreground mb-2">to</p>
          <p className="text-sm font-semibold text-foreground mb-1">
            {formatTime(metrics.sleepEndTime)}
          </p>
        </div>
      </div>

      {/* Sleep Stages Breakdown */}
      <div className="pt-6 border-t border-glass-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Sleep Stage Breakdown</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {sleepStages.map((stage) => (
            <div key={stage.name} className="text-center">
              <p className={`text-xl font-bold ${stage.color}`}>{stage.minutes}</p>
              <p className="text-xs text-muted-foreground">{stage.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ({stage.percentage.toFixed(0)}%)
              </p>
            </div>
          ))}
        </div>

        {/* Visual Sleep Stage Bar */}
        <div className="w-full h-6 bg-background/50 rounded-full overflow-hidden flex">
          {sleepStages.map((stage) => (
            <div
              key={stage.name}
              className={`${stage.bgColor} h-full transition-all duration-500 flex items-center justify-center`}
              style={{ width: `${stage.percentage}%` }}
              title={`${stage.name}: ${stage.minutes} min (${stage.percentage.toFixed(0)}%)`}
            >
              {stage.percentage > 10 && (
                <span className="text-xs font-medium text-foreground">
                  {stage.percentage.toFixed(0)}%
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
