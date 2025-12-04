import { useActivityTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Footprints, Flame, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const TrendIcon = ({ direction }: { direction: string }) => {
  if (direction === "increasing") return <TrendingUp className="h-4 w-4 text-green-500" />;
  if (direction === "declining") return <TrendingDown className="h-4 w-4 text-red-500" />;
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

export function ActivityPanel() {
  const { data, isLoading, error } = useActivityTrends();

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Activity Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
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

  const summary = data?.summary;

  if (!summary) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
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
    <Card className="bg-glass backdrop-blur-xl border-glass-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Activity Trends</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps */}
        <div className="p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Footprints className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Steps (7-day avg)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatNumber(summary.current_steps_avg)}
                </span>
                <TrendIcon direction={summary.steps_trend} />
              </div>
            </div>
          </div>
          {stepsDelta && (
            <p className="text-xs text-muted-foreground mt-2 pl-12">
              {stepsDelta} vs previous week
            </p>
          )}
        </div>

        {/* Calories */}
        <div className="p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Calories (7-day avg)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatNumber(summary.current_calories_avg)}
                </span>
                {summary.calories_change !== null && (
                  <TrendIcon direction={summary.calories_change > 0 ? "increasing" : summary.calories_change < 0 ? "declining" : "stable"} />
                )}
              </div>
            </div>
          </div>
          {caloriesDelta && (
            <p className="text-xs text-muted-foreground mt-2 pl-12">
              {caloriesDelta} vs previous week
            </p>
          )}
        </div>

        {/* Activity Score */}
        {summary.activity_score !== null && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Gauge className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Activity Score</p>
                <span className="text-2xl font-bold text-foreground">
                  {Math.round(summary.activity_score)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}