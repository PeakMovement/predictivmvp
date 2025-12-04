import { useWeeklyHealthTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface ChartDataPoint {
  week: string;
  sleep: number | null;
  readiness: number | null;
  hrv: number | null;
  activity: number | null;
  sleepDelta?: number | null;
  readinessDelta?: number | null;
  hrvDelta?: number | null;
  activityDelta?: number | null;
  sleepBaseline?: number | null;
  readinessBaseline?: number | null;
  hrvBaseline?: number | null;
  activityBaseline?: number | null;
}

const TrendIcon = ({ value }: { value: number | null | undefined }) => {
  if (value === null || value === undefined) return null;
  if (value > 0) return <TrendingUp className="h-3 w-3 text-emerald-400" />;
  if (value < 0) return <TrendingDown className="h-3 w-3 text-rose-400" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm p-3 shadow-xl animate-fade-in">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => {
          if (entry.value === null) return null;
          const delta = entry.payload[`${entry.dataKey}Delta`];
          const baseline = entry.payload[`${entry.dataKey}Baseline`];
          
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-muted-foreground">{entry.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{Math.round(entry.value)}</span>
                {delta !== undefined && delta !== null && (
                  <span className={cn(
                    "text-xs flex items-center gap-0.5",
                    delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-muted-foreground"
                  )}>
                    <TrendIcon value={delta} />
                    {delta > 0 ? "+" : ""}{delta.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function WeeklyTrendChart() {
  const { data, isLoading, error } = useWeeklyHealthTrends();

  const { chartData, wowChanges } = useMemo(() => {
    const weeklyData = data?.data || [];
    
    if (weeklyData.length === 0) {
      return { chartData: [] as ChartDataPoint[], wowChanges: null };
    }

    const chartData: ChartDataPoint[] = weeklyData.map((week) => ({
      week: format(parseISO(week.period_start), "MMM d"),
      sleep: week.metrics.sleep_score?.value ?? null,
      readiness: week.metrics.readiness_score?.value ?? null,
      hrv: week.metrics.hrv?.value ?? null,
      activity: week.metrics.activity_score?.value ?? null,
      sleepDelta: week.metrics.sleep_score?.week_over_week_pct ?? null,
      readinessDelta: week.metrics.readiness_score?.week_over_week_pct ?? null,
      hrvDelta: week.metrics.hrv?.week_over_week_pct ?? null,
      activityDelta: week.metrics.activity_score?.week_over_week_pct ?? null,
      sleepBaseline: week.metrics.sleep_score?.baseline ?? null,
      readinessBaseline: week.metrics.readiness_score?.baseline ?? null,
      hrvBaseline: week.metrics.hrv?.baseline ?? null,
      activityBaseline: week.metrics.activity_score?.baseline ?? null,
    }));

    const latestWeek = weeklyData[weeklyData.length - 1];
    const wowChanges = latestWeek ? {
      sleep: latestWeek.metrics.sleep_score?.week_over_week_pct,
      readiness: latestWeek.metrics.readiness_score?.week_over_week_pct,
      hrv: latestWeek.metrics.hrv?.week_over_week_pct,
      activity: latestWeek.metrics.activity_score?.week_over_week_pct,
    } : null;

    return { chartData, wowChanges };
  }, [data]);

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
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
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
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

  if (chartData.length === 0) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
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

  const formatWoW = (value: number | null | undefined) => {
    if (value === null || value === undefined) return null;
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const metricCards = [
    { label: "Sleep", value: wowChanges?.sleep, color: "from-indigo-500/20 to-indigo-500/5", textColor: "text-indigo-400", borderColor: "border-indigo-500/30" },
    { label: "Readiness", value: wowChanges?.readiness, color: "from-amber-500/20 to-amber-500/5", textColor: "text-amber-400", borderColor: "border-amber-500/30" },
    { label: "HRV", value: wowChanges?.hrv, color: "from-emerald-500/20 to-emerald-500/5", textColor: "text-emerald-400", borderColor: "border-emerald-500/30" },
    { label: "Activity", value: wowChanges?.activity, color: "from-purple-500/20 to-purple-500/5", textColor: "text-purple-400", borderColor: "border-purple-500/30" },
  ];

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Weekly Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Week-over-week summary with animations */}
        {wowChanges && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {metricCards.map((item, idx) => (
              <div 
                key={item.label} 
                className={cn(
                  "text-center p-3 rounded-xl border transition-all duration-300",
                  "bg-gradient-to-br hover:scale-105 hover:shadow-lg cursor-default",
                  item.color, item.borderColor
                )}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
                <div className="flex items-center justify-center gap-1">
                  <span className={cn("text-sm font-bold animate-number-pop", item.textColor)}>
                    {formatWoW(item.value) || "—"}
                  </span>
                  <TrendIcon value={item.value} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chart with smooth animations */}
        <div className="h-64" role="img" aria-label="Weekly health trends chart showing sleep, readiness, and activity scores">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="sleepGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="readinessGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" vertical={false} />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
              <ReferenceLine y={70} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeOpacity={0.3} />
              <Line
                type="monotone"
                dataKey="sleep"
                name="Sleep"
                stroke="#818cf8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#818cf8', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#818cf8', stroke: '#818cf8', strokeWidth: 3, strokeOpacity: 0.3 }}
                connectNulls
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="readiness"
                name="Readiness"
                stroke="#fbbf24"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#fbbf24', stroke: '#fbbf24', strokeWidth: 3, strokeOpacity: 0.3 }}
                connectNulls
                animationDuration={1000}
                animationEasing="ease-out"
              />
              <Line
                type="monotone"
                dataKey="activity"
                name="Activity"
                stroke="#a855f7"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#a855f7', stroke: '#a855f7', strokeWidth: 3, strokeOpacity: 0.3 }}
                connectNulls
                animationDuration={1000}
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
