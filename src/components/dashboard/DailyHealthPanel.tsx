import { useDailyHealthTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Moon, Activity, Heart, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "increasing") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (direction === "declining") return <TrendingDown className="h-4 w-4 text-rose-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const MetricIcon = ({ metric }: { metric: string }) => {
  const iconClass = "h-5 w-5 transition-transform duration-300 group-hover:scale-110";
  switch (metric) {
    case "sleep_score": return <Moon className={cn(iconClass, "text-indigo-400")} />;
    case "readiness_score": return <Zap className={cn(iconClass, "text-amber-400")} />;
    case "hrv": return <Activity className={cn(iconClass, "text-emerald-400")} />;
    case "resting_hr": return <Heart className={cn(iconClass, "text-rose-400")} />;
    default: return <Activity className={cn(iconClass, "text-muted-foreground")} />;
  }
};

const getMetricConfig = (metric: string) => {
  const configs: Record<string, { name: string; gradient: string; border: string; iconBg: string }> = {
    sleep_score: { 
      name: "Sleep", 
      gradient: "from-indigo-500/15 to-indigo-500/5",
      border: "border-indigo-500/30 hover:border-indigo-400/50",
      iconBg: "bg-indigo-500/10"
    },
    readiness_score: { 
      name: "Readiness", 
      gradient: "from-amber-500/15 to-amber-500/5",
      border: "border-amber-500/30 hover:border-amber-400/50",
      iconBg: "bg-amber-500/10"
    },
    hrv: { 
      name: "HRV", 
      gradient: "from-emerald-500/15 to-emerald-500/5",
      border: "border-emerald-500/30 hover:border-emerald-400/50",
      iconBg: "bg-emerald-500/10"
    },
    resting_hr: { 
      name: "Resting HR", 
      gradient: "from-rose-500/15 to-rose-500/5",
      border: "border-rose-500/30 hover:border-rose-400/50",
      iconBg: "bg-rose-500/10"
    },
  };
  return configs[metric] || { name: metric, gradient: "from-muted/20 to-muted/5", border: "border-border", iconBg: "bg-muted" };
};

const formatValue = (metric: string, value: number | null) => {
  if (value === null) return "—";
  if (metric === "hrv") return `${Math.round(value)}`;
  if (metric === "resting_hr") return `${Math.round(value)}`;
  return Math.round(value).toString();
};

const getUnit = (metric: string) => {
  if (metric === "hrv") return "ms";
  if (metric === "resting_hr") return "bpm";
  return "";
};

const formatDelta = (delta: number | null, metric: string) => {
  if (delta === null) return "";
  const sign = delta > 0 ? "+" : "";
  if (metric === "hrv" || metric === "resting_hr") {
    return `${sign}${delta.toFixed(1)}`;
  }
  return `${sign}${Math.round(delta)}`;
};

// Mini progress indicator showing value relative to baseline
const MiniProgress = ({ value, baseline, isGoodWhenHigh = true }: { value: number; baseline: number; isGoodWhenHigh?: boolean }) => {
  const ratio = value / baseline;
  const percentage = Math.min(ratio * 100, 150);
  const isAboveBaseline = ratio > 1;
  const isGood = isGoodWhenHigh ? isAboveBaseline : !isAboveBaseline;
  
  return (
    <div className="w-full h-1 bg-muted/30 rounded-full overflow-hidden">
      <div 
        className={cn(
          "h-full rounded-full origin-left animate-bar-grow",
          isGood ? "bg-emerald-500/50" : "bg-rose-500/50"
        )}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      />
    </div>
  );
};

export function DailyHealthPanel() {
  const { data, isLoading, error } = useDailyHealthTrends();

  const displayMetrics = useMemo(() => {
    const trends = data?.data || [];
    const latestByMetric: Record<string, typeof trends[0]> = {};
    trends.forEach((t) => {
      if (!latestByMetric[t.metric_name] || t.period_date > latestByMetric[t.metric_name].period_date) {
        latestByMetric[t.metric_name] = t;
      }
    });

    const metricsToShow = ["sleep_score", "readiness_score", "hrv", "resting_hr"];
    return metricsToShow.map((m) => latestByMetric[m]).filter(Boolean);
  }, [data]);

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Daily Health Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2 p-4 rounded-xl bg-muted/20">
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
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
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

  if (displayMetrics.length === 0) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
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
    <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Daily Health Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {displayMetrics.map((metric, idx) => {
            const config = getMetricConfig(metric.metric_name);
            const unit = getUnit(metric.metric_name);
            const isGoodWhenHigh = metric.metric_name !== "resting_hr";
            
            return (
              <div
                key={metric.metric_name}
                className={cn(
                  "group p-4 rounded-xl border transition-all duration-300",
                  "bg-gradient-to-br hover:scale-[1.02] hover:shadow-lg cursor-default",
                  config.gradient, config.border
                )}
                style={{ animationDelay: `${idx * 100}ms` }}
                role="article"
                aria-label={`${config.name}: ${formatValue(metric.metric_name, metric.value)}${unit}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("p-1.5 rounded-lg", config.iconBg)}>
                    <MetricIcon metric={metric.metric_name} />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {config.name}
                  </span>
                </div>
                
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-2xl font-bold text-foreground animate-number-pop">
                    {formatValue(metric.metric_name, metric.value)}
                  </span>
                  {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
                  <TrendIcon direction={metric.trend_direction} />
                </div>
                
                {/* Progress indicator */}
                {metric.value !== null && metric.baseline !== null && (
                  <MiniProgress 
                    value={metric.value} 
                    baseline={metric.baseline} 
                    isGoodWhenHigh={isGoodWhenHigh}
                  />
                )}
                
                {metric.delta !== null && (
                  <p className={cn(
                    "text-xs mt-2",
                    metric.delta > 0 
                      ? (isGoodWhenHigh ? "text-emerald-400" : "text-rose-400")
                      : metric.delta < 0 
                        ? (isGoodWhenHigh ? "text-rose-400" : "text-emerald-400")
                        : "text-muted-foreground"
                  )}>
                    {formatDelta(metric.delta, metric.metric_name)} vs baseline
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
