import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";

interface BaselineMetric {
  metric: string;
  baseline_value: number;
  current_value: number;
  deviation_pct: number;
  risk_status: string;
}

export default function MyBaselines() {
  const [rows, setRows] = useState<BaselineMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBaselines = async () => {
      try {
        setLoading(true);
        
        // Query yves_profiles - allow both authenticated and unauthenticated for demo
        const { data, error } = await supabase
          .from("yves_profiles" as any)
          .select("metric, baseline_value, current_value, deviation_pct, risk_status");

        if (error) {
          console.error("Error fetching baselines:", error);
        } else {
          setRows((data as any) || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBaselines();

    // Set up realtime subscription
    const channel = supabase
      .channel('yves_profiles_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'yves_profiles'
        },
        () => {
          console.log('Baselines updated, refreshing...');
          fetchBaselines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRiskColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "high":
        return "text-red-500";
      case "moderate":
        return "text-orange-500";
      case "low":
      default:
        return "text-green-500";
    }
  };

  const getRiskBgColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "high":
        return "bg-red-500/10 border-red-500/20";
      case "moderate":
        return "bg-orange-500/10 border-orange-500/20";
      case "low":
      default:
        return "bg-green-500/10 border-green-500/20";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 pb-32 md:pb-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">My Baselines</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          Compare your current performance to your personal averages.
        </p>

        {rows.length === 0 ? (
          <Card className="bg-glass backdrop-blur-xl border-glass-border shadow-glass">
            <CardContent className="p-12 text-center">
              <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Baseline Data Yet</h3>
              <p className="text-muted-foreground">
                Keep syncing your health data, and we'll calculate your personalized baselines automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {rows.map((r) => (
              <Card
                key={r.metric}
                className={`bg-glass backdrop-blur-xl border-glass-border shadow-glass transition-all duration-300 hover:scale-[1.02] hover:shadow-glow ${getRiskBgColor(r.risk_status)}`}
              >
                <CardHeader className="pb-3">
                  <h2 className="text-xl font-semibold capitalize text-foreground">
                    {r.metric.replace(/_/g, " ")}
                  </h2>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Baseline:</span>
                    <span className="text-lg font-medium text-foreground">
                      {r.baseline_value.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current:</span>
                    <span className="text-lg font-medium text-foreground">
                      {r.current_value.toFixed(1)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-glass-border">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Deviation:</span>
                      <span className={`text-lg font-semibold ${getRiskColor(r.risk_status)}`}>
                        {r.deviation_pct >= 0 ? "+" : ""}{r.deviation_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${getRiskColor(r.risk_status)} ${getRiskBgColor(r.risk_status)}`}>
                        {r.risk_status.toUpperCase()} RISK
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
