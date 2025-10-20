import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  value: number;
  label: string;
  color: string;
}

export function YvesTreeTimeline() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchYvesTreeData();
  }, []);

  const fetchYvesTreeData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '675cf687-785f-447b-b4da-42a8437bb69c';

      const { data, error: invokeError } = await supabase.functions.invoke('yves-tree', {
        body: { user_id: userId }
      });

      if (invokeError) throw invokeError;

      if (data?.chart && Array.isArray(data.chart)) {
        setChartData(data.chart);
      } else {
        setChartData([]);
      }
    } catch (err) {
      console.error('Error fetching Yves Tree data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load timeline');
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{payload[0].payload.date}</p>
          <p className="text-sm text-muted-foreground mt-1">{payload[0].payload.label}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: payload[0].payload.color }}>
            Score: {(payload[0].value * 100).toFixed(0)}
          </p>
        </div>
      );
    }
    return null;
  };

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

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            🌿 Yves Tree — Adaptive Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border-border/50">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            🌿 Yves Tree — Adaptive Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground text-sm">
            No timeline data yet — Yves is still learning your patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] border-border/50 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          🌿 Yves Tree — Adaptive Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <XAxis 
              dataKey="date" 
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            <YAxis 
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              domain={[0, 1]}
              tickFormatter={(value) => `${(value * 100).toFixed(0)}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={chartData[0]?.color || "#22c55e"}
              strokeWidth={3}
              dot={{ r: 4, fill: "#ffffff", stroke: chartData[0]?.color || "#22c55e", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
