import { useFitbitTrends } from "@/hooks/useFitbitTrends";
import { TrendCard } from "./TrendCard";
import { TrendMetric } from "@/types/fitbit";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";

export const TrendCarousel = () => {
  const { trends, isLoading, refresh } = useFitbitTrends(30);

  // Transform trends data into metrics for display
  const getMetrics = (): TrendMetric[] => {
    if (trends.length === 0) return [];

    // Sort trends by date (newest first for current value, oldest first for charts)
    const sortedTrends = [...trends].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const currentTrend = sortedTrends[0];

    // Prepare data points for each time range
    const prepareDataPoints = (days: number) => {
      return sortedTrends
        .slice(0, days)
        .reverse()
        .map((t) => ({
          date: t.date,
          formattedDate: new Date(t.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: 0, // Will be set per metric
        }));
    };

    const data7d = prepareDataPoints(7);
    const data14d = prepareDataPoints(14);
    const data30d = prepareDataPoints(30);

    return [
      {
        id: "acwr",
        name: "ACWR",
        description: "Acute:Chronic Workload Ratio",
        currentValue: currentTrend.acwr || 0,
        unit: "ratio",
        thresholds: {
          optimal: { min: 0.8, max: 1.3, color: "#10b981" }, // green
          caution: { min: 1.3, max: 1.5, color: "#f59e0b" }, // amber
          risk: { min: 1.5, max: 3.0, color: "#ef4444" }, // red
        },
        data7d: data7d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 7).reverse()[i]?.acwr || 0,
        })),
        data14d: data14d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 14).reverse()[i]?.acwr || 0,
        })),
        data30d: data30d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 30).reverse()[i]?.acwr || 0,
        })),
      },
      {
        id: "ewma",
        name: "EWMA",
        description: "Exponentially Weighted Moving Average",
        currentValue: currentTrend.ewma || 0,
        unit: "load",
        thresholds: {
          optimal: { min: 0, max: 100, color: "#10b981" },
          caution: { min: 100, max: 150, color: "#f59e0b" },
          risk: { min: 150, max: 300, color: "#ef4444" },
        },
        data7d: data7d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 7).reverse()[i]?.ewma || 0,
        })),
        data14d: data14d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 14).reverse()[i]?.ewma || 0,
        })),
        data30d: data30d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 30).reverse()[i]?.ewma || 0,
        })),
      },
      {
        id: "strain",
        name: "Strain",
        description: "Training Stress Load",
        currentValue: currentTrend.strain || 0,
        unit: "points",
        thresholds: {
          optimal: { min: 0, max: 130, color: "#10b981" },
          caution: { min: 130, max: 150, color: "#f59e0b" },
          risk: { min: 150, max: 300, color: "#ef4444" },
        },
        data7d: data7d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 7).reverse()[i]?.strain || 0,
        })),
        data14d: data14d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 14).reverse()[i]?.strain || 0,
        })),
        data30d: data30d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 30).reverse()[i]?.strain || 0,
        })),
      },
      {
        id: "monotony",
        name: "Monotony",
        description: "Load Variation Index",
        currentValue: currentTrend.monotony || 0,
        unit: "index",
        thresholds: {
          optimal: { min: 0, max: 1.5, color: "#10b981" },
          caution: { min: 1.5, max: 2.0, color: "#f59e0b" },
          risk: { min: 2.0, max: 5.0, color: "#ef4444" },
        },
        data7d: data7d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 7).reverse()[i]?.monotony || 0,
        })),
        data14d: data14d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 14).reverse()[i]?.monotony || 0,
        })),
        data30d: data30d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 30).reverse()[i]?.monotony || 0,
        })),
      },
      {
        id: "hrv",
        name: "HRV",
        description: "Heart Rate Variability (Recovery Proxy)",
        currentValue: currentTrend.hrv || 0,
        unit: "ms",
        thresholds: {
          optimal: { min: 50, max: 100, color: "#10b981" },
          caution: { min: 40, max: 50, color: "#f59e0b" },
          risk: { min: 0, max: 40, color: "#3b82f6" }, // blue for low HRV
        },
        data7d: data7d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 7).reverse()[i]?.hrv || 0,
        })),
        data14d: data14d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 14).reverse()[i]?.hrv || 0,
        })),
        data30d: data30d.map((d, i) => ({
          ...d,
          value: sortedTrends.slice(0, 30).reverse()[i]?.hrv || 0,
        })),
      },
    ];
  };

  const metrics = getMetrics();

  if (isLoading) {
    return (
      <div className="w-full px-4 md:px-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[500px] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 shadow-glass text-center mx-4 md:mx-0">
        <div className="space-y-4">
          <div className="text-4xl mb-2">📊</div>
          <h3 className="text-xl font-semibold text-foreground">No Trend Data Available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Training trends need to be calculated from your Fitbit data.
          </p>
          <p className="text-xs text-muted-foreground">
            Go to <strong>Settings → Data Management</strong> and click <strong>"Calculate Trends"</strong> to populate this data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {metrics.map((metric) => (
            <CarouselItem key={metric.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <TrendCard metric={metric} onRefresh={refresh} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </div>
  );
};
