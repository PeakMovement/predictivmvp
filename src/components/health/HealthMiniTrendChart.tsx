import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export interface TrendMetric {
  key: string;
  label: string;
  color: string;
  unit?: string;
  /** round to this many decimal places in tooltip */
  decimals?: number;
}

interface TrendRow {
  date: string;
  [key: string]: number | null | string;
}

interface HealthMiniTrendChartProps {
  data: TrendRow[];
  metrics: TrendMetric[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
  metrics,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  metrics: TrendMetric[];
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-lg text-sm">
      <p className="text-muted-foreground text-xs mb-1.5">{label}</p>
      {payload.map((entry: any) => {
        const meta = metrics.find((m) => m.key === entry.dataKey);
        const val = entry.value;
        const decimals = meta?.decimals ?? 0;
        return (
          <p key={entry.dataKey} style={{ color: entry.color }} className="font-semibold">
            {meta?.label ?? entry.dataKey}:{" "}
            {val != null ? Number(val).toFixed(decimals) : "—"}
            {meta?.unit ? ` ${meta.unit}` : ""}
          </p>
        );
      })}
    </div>
  );
};

export function HealthMiniTrendChart({ data, metrics }: HealthMiniTrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[160px] text-sm text-muted-foreground">
        Not enough data for trend
      </div>
    );
  }

  const formatted = data.map((row) => ({
    ...row,
    date: (() => {
      try { return format(new Date(row.date), "MMM d"); } catch { return row.date; }
    })(),
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip metrics={metrics} />} />
        {metrics.length > 1 && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />}
        {metrics.map((m) => (
          <Line
            key={m.key}
            type="monotone"
            dataKey={m.key}
            name={m.label}
            stroke={m.color}
            strokeWidth={2}
            dot={{ fill: m.color, r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
