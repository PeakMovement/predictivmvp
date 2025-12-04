import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface SampleData {
  date: unknown;
  metrics?: Record<string, unknown>;
}

export default function HealthDataChart() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    void fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from("health_data")
        .select("*")
        .order("collected_at", { ascending: true })
        .limit(30);

      if (error) {
        toast({
          title: "Error fetching data",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (!data || data.length === 0) {
        setIsLoading(false);
        return;
      }

      // Parse the JSONB samples data
      const parsedData: ChartDataPoint[] = [];
      const metricSet = new Set<string>();

      data.forEach((row) => {
        if (row.samples && Array.isArray(row.samples)) {
          (row.samples as Json[]).forEach((sample) => {
            const sampleData = sample as SampleData;
            if (!sampleData || typeof sampleData !== 'object') return;
            
            const dateValue = sampleData.date;
            if (!dateValue) return;
            
            const dataPoint: ChartDataPoint = {
              date: new Date(String(dateValue)).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
            };

            // Extract metrics from the sample
            const metricsObj = sampleData.metrics;
            if (metricsObj && typeof metricsObj === 'object') {
              Object.keys(metricsObj).forEach((metricKey) => {
                const metric = metricsObj[metricKey];
                const value = typeof metric === 'object' && metric !== null 
                  ? (metric as Record<string, unknown>).value 
                  : metric;
                const numericValue = parseFloat(String(value));
                
                if (!isNaN(numericValue)) {
                  dataPoint[metricKey] = numericValue;
                  metricSet.add(metricKey);
                }
              });
            }

            if (Object.keys(dataPoint).length > 1) {
              parsedData.push(dataPoint);
            }
          });
        }
      });

      setChartData(parsedData);
      setMetrics(Array.from(metricSet));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch health data.";
      toast({
        title: "Unexpected error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLineColor = (index: number) => {
    const colors = ["#6366F1", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6"];
    return colors[index % colors.length];
  };

  if (isLoading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 shadow-glass flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading health data...</p>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 shadow-glass">
        <div className="text-center space-y-3">
          <h3 className="text-lg font-semibold text-foreground">No Health Data Available</h3>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file to visualize your health metrics over time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-foreground mb-2">Health Metrics Trend</h3>
        <p className="text-sm text-muted-foreground">
          Visualizing {chartData.length} data points across {metrics.length} metrics
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="date" 
            stroke="#fff"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#fff"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
          {metrics.map((metric, index) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={getLineColor(index)}
              strokeWidth={2}
              dot={{ fill: getLineColor(index), r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
