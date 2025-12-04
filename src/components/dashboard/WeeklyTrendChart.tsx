import { useWeeklyHealthTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, parseISO } from "date-fns";

interface ChartDataPoint {
  week: string;
  sleep: number | null;
  readiness: number | null;
  hrv: number | null;
  activity: number | null;
}

export function WeeklyTrendChart() {
  const { data, isLoading, error } = useWeeklyHealthTrends();

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Weekly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Weekly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Unable to load weekly trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const weeklyData = data?.data || [];

  if (weeklyData.length === 0) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Weekly Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>No weekly trend data available yet</p>
            <p className="text-sm mt-1">Continue tracking to see week-over-week progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform data for chart
  const chartData: ChartDataPoint[] = weeklyData.map((week) => ({
    week: format(parseISO(week.period_start), "MMM d"),
    sleep: week.metrics.sleep_score?.value ?? null,
    readiness: week.metrics.readiness_score?.value ?? null,
    hrv: week.metrics.hrv?.value ?? null,
    activity: week.metrics.activity_score?.value ?? null,
  }));

  // Get latest week-over-week changes
  const latestWeek = weeklyData[weeklyData.length - 1];
  const wowChanges = latestWeek
    ? {
        sleep: latestWeek.metrics.sleep_score?.week_over_week_pct,
        readiness: latestWeek.metrics.readiness_score?.week_over_week_pct,
        hrv: latestWeek.metrics.hrv?.week_over_week_pct,
        activity: latestWeek.metrics.activity_score?.week_over_week_pct,
      }
    : null;

  const formatWoW = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Weekly Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Week-over-week summary */}
        {wowChanges && (
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[
              { label: "Sleep", value: wowChanges.sleep, color: "text-indigo-400" },
              { label: "Readiness", value: wowChanges.readiness, color: "text-amber-400" },
              { label: "HRV", value: wowChanges.hrv, color: "text-emerald-400" },
              { label: "Activity", value: wowChanges.activity, color: "text-purple-400" },
            ].map((item) => (
              <div key={item.label} className="text-center p-2 rounded-lg bg-background/50">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-sm font-semibold ${item.color}`}>
                  {formatWoW(item.value) || "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="sleep"
                name="Sleep"
                stroke="#818cf8"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="readiness"
                name="Readiness"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="activity"
                name="Activity"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}