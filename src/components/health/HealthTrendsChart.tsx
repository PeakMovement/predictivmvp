import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Activity, Heart, Moon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays } from "date-fns";

type DateRange = 7 | 30;

interface HealthMetrics {
  date: string;
  hrv_avg: number | null;
  resting_hr: number | null;
  sleep_score: number | null;
  readiness_score: number | null;
  activity_score: number | null;
}

const metricInfo = {
  hrv: {
    label: "HRV (Heart Rate Variability)",
    description: "Measures the variation in time between heartbeats. Higher HRV indicates better cardiovascular fitness and stress resilience.",
    normalRange: "50-100ms (varies by age/fitness)",
    color: "#3b82f6",
  },
  rhr: {
    label: "RHR (Resting Heart Rate)",
    description: "Your heart rate when at complete rest. Lower RHR typically indicates better cardiovascular fitness.",
    normalRange: "60-100 bpm (lower is often better)",
    color: "#ef4444",
  },
  sleep: {
    label: "Sleep Score",
    description: "Overall sleep quality based on duration, efficiency, and restfulness.",
    normalRange: "85+: Excellent, 70-84: Good, <70: Needs attention",
    color: "#8b5cf6",
  },
  readiness: {
    label: "Readiness Score",
    description: "Indicates how prepared your body is for physical and mental strain based on recovery metrics.",
    normalRange: "85+: Optimal, 70-84: Good, <70: Rest needed",
    color: "#10b981",
  },
  activity: {
    label: "Activity Score",
    description: "Measures your daily physical activity and movement patterns.",
    normalRange: "85+: Very active, 70-84: Active, <70: Sedentary",
    color: "#f59e0b",
  },
};

export const HealthTrendsChart = () => {
  const [dateRange, setDateRange] = useState<DateRange>(7);
  const [metrics, setMetrics] = useState<HealthMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<"hrv" | "rhr" | "sleep" | "readiness" | "activity">("hrv");
  const { toast } = useToast();

  useEffect(() => {
    fetchTrends();
  }, [dateRange]);

  const fetchTrends = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = format(subDays(new Date(), dateRange), "yyyy-MM-dd");
      const endDate = format(new Date(), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("date, hrv_avg, resting_hr, sleep_score, readiness_score, activity_score")
        .eq("user_id", user.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true });

      if (error) throw error;

      setMetrics(data || []);
    } catch (error) {
      console.error("Error fetching health trends:", error);
      toast({
        title: "Error",
        description: "Failed to load health trends",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getChartData = () => {
    return metrics.map((m) => ({
      date: format(new Date(m.date), "MMM d"),
      HRV: m.hrv_avg,
      RHR: m.resting_hr,
      Sleep: m.sleep_score,
      Readiness: m.readiness_score,
      Activity: m.activity_score,
    }));
  };

  const getMetricKey = () => {
    switch (selectedMetric) {
      case "hrv":
        return "HRV";
      case "rhr":
        return "RHR";
      case "sleep":
        return "Sleep";
      case "readiness":
        return "Readiness";
      case "activity":
        return "Activity";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Health Trends</CardTitle>
          <CardDescription>Loading trends...</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = getChartData();
  const currentMetricInfo = metricInfo[selectedMetric];

  return (
    <TooltipProvider>
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Health Trends
              </CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">{currentMetricInfo.label}</p>
                  <p className="text-sm mb-2">{currentMetricInfo.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Normal range: {currentMetricInfo.normalRange}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={dateRange === 7 ? "default" : "outline"}
                onClick={() => setDateRange(7)}
              >
                7 Days
              </Button>
              <Button
                size="sm"
                variant={dateRange === 30 ? "default" : "outline"}
                onClick={() => setDateRange(30)}
              >
                30 Days
              </Button>
            </div>
          </div>
          <CardDescription>Track your health metrics over time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metric Selector */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={selectedMetric === "hrv" ? "default" : "outline"}
              onClick={() => setSelectedMetric("hrv")}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              HRV
            </Button>
            <Button
              size="sm"
              variant={selectedMetric === "rhr" ? "default" : "outline"}
              onClick={() => setSelectedMetric("rhr")}
              className="flex items-center gap-2"
            >
              <Heart className="h-4 w-4" />
              RHR
            </Button>
            <Button
              size="sm"
              variant={selectedMetric === "sleep" ? "default" : "outline"}
              onClick={() => setSelectedMetric("sleep")}
              className="flex items-center gap-2"
            >
              <Moon className="h-4 w-4" />
              Sleep
            </Button>
            <Button
              size="sm"
              variant={selectedMetric === "readiness" ? "default" : "outline"}
              onClick={() => setSelectedMetric("readiness")}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Readiness
            </Button>
            <Button
              size="sm"
              variant={selectedMetric === "activity" ? "default" : "outline"}
              onClick={() => setSelectedMetric("activity")}
              className="flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Activity
            </Button>
          </div>

          {/* Chart */}
          {chartData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No data available for the selected period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                <XAxis
                  dataKey="date"
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid #333",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={getMetricKey()}
                  stroke={currentMetricInfo.color}
                  strokeWidth={2}
                  dot={{ fill: currentMetricInfo.color, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}

          {/* Metric Summary */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Average</p>
                <p className="text-lg font-bold text-foreground">
                  {(
                    chartData.reduce((sum, d) => sum + (d[getMetricKey()] || 0), 0) /
                    chartData.filter((d) => d[getMetricKey()] !== null).length
                  ).toFixed(1)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Highest</p>
                <p className="text-lg font-bold text-foreground">
                  {Math.max(...chartData.map((d) => d[getMetricKey()] || 0)).toFixed(1)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Lowest</p>
                <p className="text-lg font-bold text-foreground">
                  {Math.min(
                    ...chartData.filter((d) => d[getMetricKey()] !== null).map((d) => d[getMetricKey()] || 0)
                  ).toFixed(1)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
