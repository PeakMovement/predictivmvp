import { Activity, Footprints, Mountain, TrendingUp, Zap, Clock } from "lucide-react";
import { useFitbitMetrics } from "@/hooks/useFitbitMetrics";
import { Skeleton } from "@/components/ui/skeleton";

export const ActivityMetricsCard = () => {
  const { metrics, isLoading } = useFitbitMetrics();

  if (isLoading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const metricItems = [
    {
      icon: Footprints,
      label: "Steps",
      value: metrics.steps.toLocaleString(),
      unit: "steps",
      color: "text-blue-400",
    },
    {
      icon: TrendingUp,
      label: "Distance",
      value: metrics.distance.toFixed(2),
      unit: "km",
      color: "text-green-400",
    },
    {
      icon: Clock,
      label: "Active Minutes",
      value: (metrics.fairlyActiveMinutes + metrics.veryActiveMinutes).toString(),
      unit: "min",
      color: "text-orange-400",
    },
    {
      icon: Zap,
      label: "Calories Burned",
      value: metrics.caloriesOut.toLocaleString(),
      unit: "cal",
      color: "text-red-400",
    },
    {
      icon: Mountain,
      label: "Floors Climbed",
      value: metrics.floors.toString(),
      unit: "floors",
      color: "text-purple-400",
      hide: metrics.floors === 0,
    },
    {
      icon: TrendingUp,
      label: "Elevation Gain",
      value: metrics.elevation.toString(),
      unit: "m",
      color: "text-indigo-400",
      hide: metrics.elevation === 0,
    },
  ].filter(item => !item.hide);

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover-glow animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Activity & Movement</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4 hover:bg-background/70 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-2">
                <Icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground mb-1">
                {item.value}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.label} • {item.unit}
              </p>
            </div>
          );
        })}
      </div>

      {/* Activity Breakdown */}
      <div className="mt-6 pt-6 border-t border-glass-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Activity Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground">{metrics.sedentaryMinutes}</p>
            <p className="text-xs text-gray-400">Sedentary</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-blue-400">{metrics.lightlyActiveMinutes}</p>
            <p className="text-xs text-muted-foreground">Lightly Active</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-orange-400">{metrics.fairlyActiveMinutes}</p>
            <p className="text-xs text-muted-foreground">Fairly Active</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-red-400">{metrics.veryActiveMinutes}</p>
            <p className="text-xs text-muted-foreground">Very Active</p>
          </div>
        </div>
      </div>
    </div>
  );
};
