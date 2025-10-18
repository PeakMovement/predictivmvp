import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useFitbitTrends } from "@/hooks/useFitbitTrends";
import { TrendMetric } from "@/types/fitbit";

export const UnifiedTrendCard = () => {
  const { trends, isLoading, refresh } = useFitbitTrends({ days: 30 });
  const [currentMetricIndex, setCurrentMetricIndex] = useState(0);
  const [timeRange, setTimeRange] = useState<"7d" | "14d" | "30d">("7d");
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Transform trends data into metrics
  const getMetrics = (): TrendMetric[] => {
    if (trends.length === 0) return [];

    const sortedTrends = [...trends].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const currentTrend = sortedTrends[0];

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
          value: 0,
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
          optimal: { min: 0.8, max: 1.3, color: "#10b981" },
          caution: { min: 1.3, max: 1.5, color: "#f59e0b" },
          risk: { min: 1.5, max: 3.0, color: "#ef4444" },
        },
        data7d: data7d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 7).reverse()[i]?.acwr || 0 })),
        data14d: data14d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 14).reverse()[i]?.acwr || 0 })),
        data30d: data30d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 30).reverse()[i]?.acwr || 0 })),
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
        data7d: data7d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 7).reverse()[i]?.ewma || 0 })),
        data14d: data14d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 14).reverse()[i]?.ewma || 0 })),
        data30d: data30d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 30).reverse()[i]?.ewma || 0 })),
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
        data7d: data7d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 7).reverse()[i]?.strain || 0 })),
        data14d: data14d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 14).reverse()[i]?.strain || 0 })),
        data30d: data30d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 30).reverse()[i]?.strain || 0 })),
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
        data7d: data7d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 7).reverse()[i]?.monotony || 0 })),
        data14d: data14d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 14).reverse()[i]?.monotony || 0 })),
        data30d: data30d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 30).reverse()[i]?.monotony || 0 })),
      },
      {
        id: "hrv",
        name: "HRV",
        description: "Heart Rate Variability",
        currentValue: currentTrend.hrv || 0,
        unit: "ms",
        thresholds: {
          optimal: { min: 50, max: 100, color: "#10b981" },
          caution: { min: 40, max: 50, color: "#f59e0b" },
          risk: { min: 0, max: 40, color: "#3b82f6" },
        },
        data7d: data7d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 7).reverse()[i]?.hrv || 0 })),
        data14d: data14d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 14).reverse()[i]?.hrv || 0 })),
        data30d: data30d.map((d, i) => ({ ...d, value: sortedTrends.slice(0, 30).reverse()[i]?.hrv || 0 })),
      },
    ];
  };

  const metrics = getMetrics();
  const currentMetric = metrics[currentMetricIndex];

  // Auto-advance every 4 seconds
  useEffect(() => {
    if (isPaused || metrics.length === 0) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentMetricIndex((prev) => (prev + 1) % metrics.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, metrics.length]);

  const handlePrev = () => {
    setIsPaused(true);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentMetricIndex((prev) => (prev - 1 + metrics.length) % metrics.length);
      setIsTransitioning(false);
    }, 300);
  };

  const handleNext = () => {
    setIsPaused(true);
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentMetricIndex((prev) => (prev + 1) % metrics.length);
      setIsTransitioning(false);
    }, 300);
  };

  const getData = () => {
    if (!currentMetric) return [];
    return timeRange === "7d" ? currentMetric.data7d : timeRange === "14d" ? currentMetric.data14d : currentMetric.data30d;
  };

  const getStatusColor = () => {
    if (!currentMetric) return "#10b981";
    const value = currentMetric.currentValue;
    const { optimal, caution, risk } = currentMetric.thresholds;

    if (value >= risk.min && value <= risk.max) return risk.color;
    if (value >= caution.min && value <= caution.max) return caution.color;
    return optimal.color;
  };

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">No trend data available</p>
        </CardContent>
      </Card>
    );
  }

  const data = getData();
  const statusColor = getStatusColor();

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className={cn(
            "flex-1 text-center transition-all duration-300",
            isTransitioning ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
          )}>
            <CardTitle className="text-lg font-semibold">{currentMetric?.name}</CardTitle>
            <CardDescription className="text-xs">{currentMetric?.description}</CardDescription>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className={cn(
          "flex items-center justify-center gap-2 mt-4 transition-all duration-300",
          isTransitioning ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}>
          <span className="text-3xl font-bold">{currentMetric?.currentValue.toFixed(1)}</span>
          <Badge style={{ backgroundColor: statusColor }} className="text-white">
            {currentMetric?.unit}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className={cn(
          "transition-all duration-300",
          isTransitioning ? "opacity-0" : "opacity-100"
        )}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`color-${currentMetric?.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={statusColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={statusColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                <XAxis
                  dataKey="formattedDate"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={statusColor}
                  strokeWidth={2}
                  fill={`url(#color-${currentMetric?.id})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
              No data available for {timeRange}
            </div>
          )}
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {metrics.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsPaused(true);
                setCurrentMetricIndex(index);
              }}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                index === currentMetricIndex ? "w-6 bg-primary" : "w-2 bg-muted"
              )}
            />
          ))}
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-0">
        <div className="flex gap-1">
          {(["7d", "14d", "30d"] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="h-7 text-xs"
            >
              {range}
            </Button>
          ))}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={refresh}
          className="h-7 w-7"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </CardFooter>
    </Card>
  );
};
