/**
 * Sparkline Component
 *
 * Small inline chart for showing trends in compact spaces.
 * Perfect for dashboards and metric cards.
 *
 * @component
 */
import { LineChart, Line, AreaChart, Area, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export interface SparklineDataPoint {
  value: number;
  label?: string;
}

interface SparklineProps {
  /** Data points */
  data: SparklineDataPoint[];
  /** Chart color */
  color?: string;
  /** Height in pixels */
  height?: number;
  /** Chart type */
  type?: "line" | "area";
  /** Show trend indicator */
  showTrend?: boolean;
  /** Stroke width */
  strokeWidth?: number;
  /** CSS class name */
  className?: string;
}

export const Sparkline = ({
  data,
  color = "#3b82f6",
  height = 40,
  type = "line",
  showTrend = false,
  strokeWidth = 2,
  className,
}: SparklineProps) => {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ height }}>
        <span className="text-xs text-muted-foreground">No data</span>
      </div>
    );
  }

  const trend = data.length > 1
    ? data[data.length - 1].value - data[0].value
    : 0;

  const trendPercent = data.length > 1 && data[0].value !== 0
    ? ((trend / data[0].value) * 100).toFixed(1)
    : "0";

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ResponsiveContainer width="100%" height={height}>
        {type === "area" ? (
          <AreaChart data={data}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.3}
              strokeWidth={strokeWidth}
              isAnimationActive={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={strokeWidth}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
      {showTrend && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{trendPercent}%</span>
        </div>
      )}
    </div>
  );
};

/**
 * Metric Card with Sparkline
 *
 * Displays a metric value with a sparkline trend indicator
 */
interface MetricSparklineCardProps {
  /** Metric label */
  label: string;
  /** Current value */
  value: string | number;
  /** Unit (optional) */
  unit?: string;
  /** Sparkline data */
  data: SparklineDataPoint[];
  /** Color */
  color?: string;
  /** Change percentage */
  change?: number;
  /** Additional description */
  description?: string;
}

export const MetricSparklineCard = ({
  label,
  value,
  unit,
  data,
  color = "#3b82f6",
  change,
  description,
}: MetricSparklineCardProps) => {
  const changeColor = change && change > 0
    ? "text-green-600"
    : change && change < 0
    ? "text-red-600"
    : "text-muted-foreground";

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {change !== undefined && (
            <p className={cn("text-xs font-medium", changeColor)}>
              {change > 0 && "+"}{change.toFixed(1)}% from last period
            </p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <Sparkline
        data={data}
        color={color}
        height={50}
        type="area"
        showTrend
      />
    </div>
  );
};
