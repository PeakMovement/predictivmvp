import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendMetric, TrendDataPoint } from "@/types/fitbit";

interface TrendCardProps {
  metric: TrendMetric;
  onRefresh?: () => void;
}

type TimeRange = "7d" | "14d" | "30d";

export const TrendCard = ({ metric, onRefresh }: TrendCardProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");

  const getData = (): TrendDataPoint[] => {
    switch (timeRange) {
      case "7d":
        return metric.data7d;
      case "14d":
        return metric.data14d;
      case "30d":
        return metric.data30d;
      default:
        return metric.data7d;
    }
  };

  const data = getData();
  const hasData = data.length > 0;

  // Determine status color based on current value and thresholds
  const getStatusColor = () => {
    const val = metric.currentValue;
    const { optimal, caution, risk } = metric.thresholds;

    if (val >= risk.min && val <= risk.max) return risk.color;
    if (val >= caution.min && val <= caution.max) return caution.color;
    if (val >= optimal.min && val <= optimal.max) return optimal.color;
    return "hsl(var(--muted-foreground))";
  };

  const statusColor = getStatusColor();

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border rounded-2xl p-6 shadow-glass min-w-[320px] md:min-w-[400px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{metric.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{metric.description}</p>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-8 w-8 hover:bg-glass-highlight"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Current Value Badge */}
      <div className="mb-4 flex items-center gap-2">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: `${statusColor}20`, border: `1px solid ${statusColor}` }}
        >
          <span className="text-2xl font-bold" style={{ color: statusColor }}>
            {metric.currentValue.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">{metric.unit}</span>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2 mb-4">
        {(["7d", "14d", "30d"] as TimeRange[]).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? "bg-primary text-primary-foreground"
                : "bg-glass-highlight text-muted-foreground hover:text-foreground"
            }`}
          >
            {range.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${metric.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={statusColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={statusColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />

            <XAxis
              dataKey="formattedDate"
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "11px" }}
              tickMargin={8}
            />

            <YAxis
              stroke="hsl(var(--muted-foreground))"
              style={{ fontSize: "11px" }}
              domain={["auto", "auto"]}
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.9)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                color: "#fff",
                padding: "8px 12px",
              }}
              formatter={(value: number) => [value.toFixed(2), metric.name]}
            />

            {/* Threshold Reference Lines */}
            {metric.thresholds.caution.max < 1000 && (
              <ReferenceLine
                y={metric.thresholds.caution.min}
                stroke={metric.thresholds.caution.color}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            )}
            {metric.thresholds.risk.max < 1000 && (
              <ReferenceLine
                y={metric.thresholds.risk.min}
                stroke={metric.thresholds.risk.color}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            )}

            <Area
              type="monotone"
              dataKey="value"
              stroke={statusColor}
              strokeWidth={2}
              fill={`url(#gradient-${metric.id})`}
              animationDuration={500}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[280px] flex items-center justify-center bg-glass-highlight rounded-xl">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">No data available</p>
            <p className="text-xs text-muted-foreground">
              Sync your Fitbit to see trends
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-glass-border">
        <p className="text-xs text-muted-foreground text-center">
          Auto-updated from Fitbit sync
        </p>
      </div>
    </Card>
  );
};
