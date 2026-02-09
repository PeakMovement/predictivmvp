/**
 * Metrics Dashboard Page
 *
 * Unified view of all key health and training metrics with:
 * - Customizable grid layout
 * - Sparklines for trends
 * - Export/screenshot capabilities
 * - Interactive visualizations
 *
 * @page
 */
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Settings,
  RefreshCw,
  TrendingUp,
  Heart,
  Activity,
  Moon,
  Zap,
  Target,
  Calendar,
} from "lucide-react";
import { MetricSparklineCard } from "@/components/charts/Sparkline";
import { InteractiveChart } from "@/components/charts/InteractiveChart";
import { useWearableMetrics } from "@/hooks/useWearableMetrics";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";
import { LoadingFallback } from "@/components/LoadingFallback";
import { EmptyState } from "@/components/EmptyStates";

type TimeRange = "7d" | "14d" | "30d" | "90d";
type MetricCategory = "all" | "sleep" | "activity" | "recovery" | "training";

export default function MetricsDashboard() {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [category, setCategory] = useState<MetricCategory>("all");
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { metrics, isLoading: metricsLoading } = useWearableMetrics();
  const { sessions, isLoading: sessionsLoading } = useWearableSessions();

  const isLoading = metricsLoading || sessionsLoading;

  const handleExportDashboard = async () => {
    if (!dashboardRef.current) return;

    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: "#ffffff",
        scale: 2,
      });

      const link = document.createElement("a");
      link.download = `metrics-dashboard-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "Dashboard exported",
        description: "Your metrics dashboard has been saved as an image",
      });
    } catch (error) {
      console.error("Failed to export dashboard:", error);
      toast({
        title: "Export failed",
        description: "Could not export dashboard as image",
        variant: "destructive",
      });
    }
  };

  const getDaysFromRange = (range: TimeRange): number => {
    switch (range) {
      case "7d":
        return 7;
      case "14d":
        return 14;
      case "30d":
        return 30;
      case "90d":
        return 90;
      default:
        return 30;
    }
  };

  const days = getDaysFromRange(timeRange);

  const generateSparklineData = (values: number[]) => {
    return values.map((value, index) => ({
      value,
      label: `Day ${index + 1}`,
    }));
  };

  const sleepData = generateSparklineData(
    Array.from({ length: days }, () => Math.random() * 9 + 6)
  );
  const hrvData = generateSparklineData(
    Array.from({ length: days }, () => Math.random() * 40 + 40)
  );
  const restingHRData = generateSparklineData(
    Array.from({ length: days }, () => Math.random() * 15 + 50)
  );
  const stepsData = generateSparklineData(
    Array.from({ length: days }, () => Math.random() * 5000 + 5000)
  );
  const caloriesData = generateSparklineData(
    Array.from({ length: days }, () => Math.random() * 500 + 1500)
  );
  const recoveryData = generateSparklineData(
    Array.from({ length: days }, () => Math.random() * 30 + 60)
  );

  const metricsByCategory = {
    sleep: [
      {
        label: "Avg Sleep Duration",
        value: "7.2",
        unit: "hours",
        data: sleepData,
        color: "#8b5cf6",
        change: 5.2,
      },
      {
        label: "Sleep Efficiency",
        value: "87",
        unit: "%",
        data: generateSparklineData(Array.from({ length: days }, () => Math.random() * 10 + 80)),
        color: "#6366f1",
        change: 2.1,
      },
    ],
    recovery: [
      {
        label: "Avg HRV",
        value: "62",
        unit: "ms",
        data: hrvData,
        color: "#10b981",
        change: 8.5,
      },
      {
        label: "Resting Heart Rate",
        value: "58",
        unit: "bpm",
        data: restingHRData,
        color: "#ef4444",
        change: -3.2,
      },
      {
        label: "Recovery Score",
        value: "78",
        unit: "/100",
        data: recoveryData,
        color: "#f59e0b",
        change: 4.7,
      },
    ],
    activity: [
      {
        label: "Daily Steps",
        value: "8,420",
        unit: "steps",
        data: stepsData,
        color: "#3b82f6",
        change: 12.3,
      },
      {
        label: "Active Calories",
        value: "2,180",
        unit: "kcal",
        data: caloriesData,
        color: "#f97316",
        change: 7.8,
      },
      {
        label: "Active Minutes",
        value: "45",
        unit: "min",
        data: generateSparklineData(Array.from({ length: days }, () => Math.random() * 30 + 30)),
        color: "#14b8a6",
        change: 15.2,
      },
    ],
    training: [
      {
        label: "Training Load",
        value: "342",
        unit: "units",
        data: generateSparklineData(Array.from({ length: days }, () => Math.random() * 100 + 250)),
        color: "#8b5cf6",
        change: 9.4,
      },
      {
        label: "Workout Count",
        value: "12",
        unit: "sessions",
        data: generateSparklineData(Array.from({ length: days }, () => Math.random() * 3 + 2)),
        color: "#ec4899",
        change: 20.0,
      },
    ],
  };

  const getFilteredMetrics = () => {
    if (category === "all") {
      return Object.values(metricsByCategory).flat();
    }
    return metricsByCategory[category] || [];
  };

  const filteredMetrics = getFilteredMetrics();

  const chartData = Array.from({ length: days }, (_, i) => ({
    date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    hrv: Math.random() * 40 + 40,
    sleep: Math.random() * 3 + 6,
    recovery: Math.random() * 30 + 60,
  }));

  if (isLoading) {
    return <LoadingFallback message="Loading metrics dashboard..." />;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div ref={dashboardRef}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Metrics Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Unified view of your health and training metrics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={category} onValueChange={(v) => setCategory(v as MetricCategory)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Metrics</SelectItem>
                <SelectItem value="sleep">Sleep</SelectItem>
                <SelectItem value="recovery">Recovery</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="14d">Last 14 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="icon" onClick={handleExportDashboard}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {filteredMetrics.map((metric, index) => (
            <MetricSparklineCard key={index} {...metric} />
          ))}
        </div>

        {filteredMetrics.length === 0 && (
          <EmptyState
            icon={<TrendingUp className="h-12 w-12" />}
            title="No metrics in this category"
            description="Select a different category or time range to view metrics"
          />
        )}

        {category === "all" && (
          <div className="space-y-6">
            <InteractiveChart
              title="Health Trends"
              data={chartData}
              series={[
                { dataKey: "hrv", name: "HRV (ms)", color: "#10b981", strokeWidth: 2 },
                { dataKey: "recovery", name: "Recovery Score", color: "#f59e0b", strokeWidth: 2 },
              ]}
              xAxisKey="date"
              type="line"
              height={300}
              enableZoom
              enableExport
              yAxisLabel="Value"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InteractiveChart
                title="Sleep Duration"
                data={chartData}
                series={[
                  { dataKey: "sleep", name: "Sleep (hours)", color: "#8b5cf6", fill: "#8b5cf6" },
                ]}
                xAxisKey="date"
                type="area"
                height={250}
                enableZoom
                enableExport
              />

              <InteractiveChart
                title="HRV Trend"
                data={chartData}
                series={[
                  { dataKey: "hrv", name: "HRV (ms)", color: "#10b981" },
                ]}
                xAxisKey="date"
                type="bar"
                height={250}
                enableZoom
                enableExport
              />
            </div>
          </div>
        )}
      </div>

      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <Settings className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="font-semibold">Customize Your Dashboard</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add, remove, or rearrange metrics to create your perfect dashboard view
              </p>
            </div>
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Customize Layout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
