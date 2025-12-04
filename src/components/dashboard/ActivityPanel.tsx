import { useActivityTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Footprints, Flame, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "increasing") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (direction === "declining") return <TrendingDown className="h-4 w-4 text-rose-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const formatNumber = (value: number | null) => {
  if (value === null) return "—";
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return Math.round(value).toLocaleString();
};

const formatDelta = (delta: number | null) => {
  if (delta === null) return null;
  const sign = delta > 0 ? "+" : "";
  if (Math.abs(delta) >= 1000) {
    return `${sign}${(delta / 1000).toFixed(1)}k`;
  }
  return `${sign}${Math.round(delta).toLocaleString()}`;
};

// Animated progress ring for activity score
const ActivityRing = ({ score }: { score: number }) => {
  const circumference = 2 * Math.PI * 36;
  const progress = Math.min(score / 100, 1);
  const strokeDashoffset = circumference * (1 - progress);
  
  const getColor = (s: number) => {
    if (s >= 80) return "#a855f7";
    if (s >= 60) return "#8b5cf6";
    if (s >= 40) return "#6366f1";
    return "#64748b";
  };
  
  const color = getColor(score);

  return (
    <div className="relative w-20 h-20">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-foreground animate-number-pop">{Math.round(score)}</span>
      </div>
    </div>
  );
};

// Animated metric card with baseline comparison
const MetricCard = ({
  icon: Icon,
  iconColor,
  iconBg,
  label,
  value,
  baseline,
  delta,
  trend,
  delay = 0,
}: {
  icon: typeof Footprints;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number | null;
  baseline?: number | null;
  delta: string | null;
  trend?: string;
  delay?: number;
}) => {
  const baselinePercent = baseline && value ? ((value / baseline) * 100).toFixed(0) : null;
  
  return (
    <div 
      className={cn(
        "p-4 rounded-xl bg-background/50 border border-border/50",
        "transition-all duration-300 hover:scale-[1.02] hover:border-primary/30 hover:shadow-lg"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2.5 rounded-xl transition-transform duration-300 hover:scale-110", iconBg)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground animate-number-pop">
              {formatNumber(value)}
            </span>
            {trend && <TrendIcon direction={trend} />}
          </div>
          
          {/* Baseline comparison bar */}
          {baseline && value && (
            <div className="mt-2 space-y-1">
              <div className="h-1.5 bg-muted/50 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full origin-left animate-bar-grow",
                    iconBg.replace('/10', '/50')
                  )}
                  style={{ 
                    width: `${Math.min((value / baseline) * 100, 150)}%`,
                    animationDelay: `${delay + 200}ms`,
                  }}
                />
                {/* Baseline marker */}
                <div 
                  className="relative -mt-1.5 w-0.5 h-1.5 bg-muted-foreground/70"
                  style={{ marginLeft: '100%', transform: 'translateX(-50%)' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>{baselinePercent}% of baseline</span>
                <span className="opacity-50">Baseline: {formatNumber(baseline)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {delta && (
        <p className={cn(
          "text-xs mt-2 pl-12",
          delta.startsWith('+') ? "text-emerald-400" : delta.startsWith('-') ? "text-rose-400" : "text-muted-foreground"
        )}>
          {delta} vs previous week
        </p>
      )}
    </div>
  );
};

export function ActivityPanel() {
  const { data, isLoading, error } = useActivityTrends();

  const summary = useMemo(() => data?.summary, [data]);

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
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
          <CardTitle className="text-lg font-semibold">Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Unable to load activity data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No activity trend data available yet</p>
            <p className="text-sm mt-1">Sync your Oura Ring to see activity trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stepsDelta = formatDelta(summary.steps_change);
  const caloriesDelta = formatDelta(summary.calories_change);

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Activity Trends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps */}
        <MetricCard
          icon={Footprints}
          iconColor="text-sky-400"
          iconBg="bg-sky-500/10"
          label="Steps (7-day avg)"
          value={summary.current_steps_avg}
          baseline={summary.steps_baseline}
          delta={stepsDelta}
          trend={summary.steps_trend}
          delay={0}
        />

        {/* Calories */}
        <MetricCard
          icon={Flame}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          label="Calories (7-day avg)"
          value={summary.current_calories_avg}
          baseline={summary.calories_baseline}
          delta={caloriesDelta}
          trend={summary.calories_change !== null ? (summary.calories_change > 0 ? "increasing" : summary.calories_change < 0 ? "declining" : "stable") : undefined}
          delay={100}
        />

        {/* Activity Score with Ring */}
        {summary.activity_score !== null && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
            <div className="flex items-center gap-4">
              <ActivityRing score={summary.activity_score} />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">Activity Score</p>
                <p className="text-xs text-muted-foreground">
                  {summary.activity_score >= 80 ? "Excellent activity level!" :
                   summary.activity_score >= 60 ? "Good activity level" :
                   summary.activity_score >= 40 ? "Moderate activity" :
                   "Consider increasing activity"}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Gauge className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
