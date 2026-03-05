import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/** ----------------------------
 *  TYPES
 * ---------------------------- */
interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
  color: string;
}

interface RawChartData {
  date?: string;
  value?: number;
  label?: string;
}

/** ----------------------------
 *  COMPONENT
 * ---------------------------- */
export function YvesTreeTimeline() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** 🔹 Fetch Adaptive Timeline Data */
  useEffect(() => {
    const fetchYvesTreeData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 🧠 Resolve user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const userId = user?.id || "675cf687-785f-447b-b4da-42a8437bb69c";

        // 🌿 Invoke Edge Function
        const { data, error: invokeError } = await supabase.functions.invoke("yves-tree", {
          body: { user_id: userId },
        });

        if (invokeError) throw invokeError;

        // 🧩 Parse Data
        if (Array.isArray(data?.chart)) {
          const enhanced = data.chart.map((d: RawChartData) => {
            const numValue = typeof d.value === 'number' ? d.value : 0;
            return {
              date: d.date || '',
              value: numValue,
              label: d.label || '',
              color:
                numValue > 0.8
                  ? "#22c55e" // green - strong trend
                  : numValue > 0.6
                    ? "#facc15" // yellow - neutral
                    : "#ef4444", // red - drop
            };
          });
          setChartData(enhanced);
        } else {
          setChartData([]);
        }
      } catch (err) {
        console.error("❌ Error fetching Yves Tree timeline:", err);
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      } finally {
        setIsLoading(false);
      }
    };

    fetchYvesTreeData();

    // 🕒 Auto-refresh every 10 minutes
    const interval = setInterval(fetchYvesTreeData, 600000);
    return () => clearInterval(interval);
  }, []);

  /** 🧠 Custom Tooltip */
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartDataPoint }> }) => {
    if (active && payload && payload.length) {
      const { date, label, color, value } = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg backdrop-blur-sm">
          <p className="text-sm font-medium">{date}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
          <p className="text-sm font-semibold mt-1" style={{ color }}>
            Score: {(value * 100).toFixed(0)}%
          </p>
        </div>
      );
    }
    return null;
  };

  /** 🌀 Loading State */
  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            🌿 Yves Tree — Adaptive Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  /** 🚫 Error State */
  if (error) {
    return (
      <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">🌿 Yves Tree — Adaptive Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  /** 📉 Empty State */
  if (chartData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">🌿 Yves Tree — Adaptive Timeline</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm text-center">
            No timeline data yet — Yves is still learning your performance trends.
          </p>
        </CardContent>
      </Card>
    );
  }

  /** 📊 Chart Rendering */
  return (
    <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border-border/50 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          🌿 Yves Tree — Adaptive Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <defs>
              <linearGradient id="glowLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="url(#glowLine)"
              strokeWidth={3}
              dot={{
                r: 4,
                fill: "#fff",
                stroke: "#22c55e",
                strokeWidth: 2,
              }}
              activeDot={{ r: 6, fill: "#8b5cf6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
