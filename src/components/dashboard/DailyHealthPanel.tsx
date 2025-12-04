import { useDailyHealthTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Moon, Activity, Heart, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "increasing") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (direction === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const MetricIcon = ({ metric }: { metric: string }) => {
  switch (metric) {
    case "sleep_score": return <Moon className="h-5 w-5 text-indigo-400" />;
    case "readiness_score": return <Zap className="h-5 w-5 text-amber-400" />;
    case "hrv": return <Activity className="h-5 w-5 text-emerald-400" />;
    case "resting_hr": return <Heart className="h-5 w-5 text-rose-400" />;
    default: return <Activity className="h-5 w-5 text-muted-foreground" />;
  }
};

const formatMetricName = (name: string) => {
  const names: Record<string, string> = {
    sleep_score: "Sleep",
    readiness_score: "Readiness",
    hrv: "HRV",
    resting_hr: "Resting HR",
  };
  return names[name] || name;
};

const formatValue = (metric: string, value: number | null) => {
  if (value === null) return "—";
  if (metric === "hrv") return `${Math.round(value)} ms`;
  if (metric === "resting_hr") return `${Math.round(value)} bpm`;
  return Math.round(value).toString();
};

const formatDelta = (delta: number | null, metric: string) => {
  if (delta === null) return "";
  const sign = delta > 0 ? "+" : "";
  if (metric === "hrv" || metric === "resting_hr") {
    return `${sign}${delta.toFixed(1)}`;
  }
  return `${sign}${Math.round(delta)}`;
};

export function DailyHealthPanel() {
  const { data, isLoading, error } = useDailyHealthTrends();

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Daily Health Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Daily Health Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Unable to load health trends</p>
            <p className="text-sm mt-1">Please try again later</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get the latest values for each metric
  const trends = data?.data || [];
  const latestByMetric: Record<string, typeof trends[0]> = {};
  trends.forEach((t) => {
    if (!latestByMetric[t.metric_name] || t.period_date > latestByMetric[t.metric_name].period_date) {
      latestByMetric[t.metric_name] = t;
    }
  });

  const metricsToShow = ["sleep_score", "readiness_score", "hrv", "resting_hr"];
  const displayMetrics = metricsToShow.map((m) => latestByMetric[m]).filter(Boolean);

  if (displayMetrics.length === 0) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Daily Health Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No health trend data available yet</p>
            <p className="text-sm mt-1">Sync your Oura Ring to see your trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Daily Health Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {displayMetrics.map((metric) => (
            <div
              key={metric.metric_name}
              className={cn(
                "p-4 rounded-xl border transition-all",
                "bg-background/50 border-border/50 hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <MetricIcon metric={metric.metric_name} />
                <span className="text-sm font-medium text-muted-foreground">
                  {formatMetricName(metric.metric_name)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatValue(metric.metric_name, metric.value)}
                </span>
                <TrendIcon direction={metric.trend_direction} />
              </div>
              {metric.delta !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDelta(metric.delta, metric.metric_name)} vs baseline ({formatValue(metric.metric_name, metric.baseline)})
                </p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}