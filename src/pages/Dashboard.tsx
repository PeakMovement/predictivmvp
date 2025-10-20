import { TrendingUp, Target, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useFitbitTrends } from "@/hooks/useFitbitTrends";
import { calculateMetrics } from "@/lib/metricsCalculator";
import { FitbitSyncStatus } from "@/components/FitbitSyncStatus";
import { FeedbackSummaryPanel } from "@/components/dashboard/FeedbackSummaryPanel";
import { DocumentIntelligenceCard } from "@/components/dashboard/DocumentIntelligenceCard";
import { HealthProfileViewer } from "@/components/health/HealthProfileViewer";
import { YvesTreeTimeline } from "@/components/dashboard/YvesTreeTimeline";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const getStatusColor = (status: string) => {
  switch (status) {
    case "green":
      return "bg-green-500";
    case "yellow":
      return "bg-yellow-500";
    case "red":
      return "bg-red-500";
    default:
      return "bg-muted";
  }
};

const WelcomeHeader = () => (
  <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
    <h1 className="text-xl md:text-2xl font-light text-muted-foreground mb-1 md:mb-2">Hello,</h1>
    <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Athlete</h2>
    <p className="text-muted-foreground text-base md:text-lg">Here's your training overview for today</p>
    <div className="flex justify-center mt-2">
      <FitbitSyncStatus />
    </div>
  </div>
);

export const Dashboard = () => {
  const { trends, latestTrend, isLoading, lastUpdate } = useFitbitTrends({ days: 7 });
  const { profile } = useHealthProfile();
  const [acwr, setAcwr] = useState<string>("—");
  const [strain, setStrain] = useState<string>("—");
  const [sleepScore, setSleepScore] = useState<string>("—");

  // 📈 Calculate Metrics whenever new trends load
  useEffect(() => {
    if (!latestTrend || trends.length === 0) return;

    const metrics = calculateMetrics(trends);
    setAcwr(metrics.latest.acwr ? metrics.latest.acwr.toFixed(2) : "—");
    setStrain(metrics.latest.strain ? Math.round(metrics.latest.strain).toString() : "—");
    setSleepScore(metrics.latest.sleepScore ? metrics.latest.sleepScore.toFixed(0) : "—");
  }, [latestTrend, trends]);

  // 🕓 Re-render when Fitbit data is refreshed globally
  useEffect(() => {
    const handler = () => window.location.reload();
    window.addEventListener("fitbit_data_refreshed", handler);
    return () => window.removeEventListener("fitbit_data_refreshed", handler);
  }, []);

  const dashboardMetrics = [
    { name: "ACWR", value: acwr, status: "green" },
    { name: "Strain", value: strain, status: "yellow" },
    { name: "Sleep Score", value: sleepScore, status: "green" },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
        <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8">
          {/* 👋 Welcome Header */}
          <WelcomeHeader />

          {/* 📊 Training Metrics */}
          <div className="text-center mb-6 md:mb-8">
            <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1 md:mb-2">Training Metrics</h3>
            <p className="text-sm md:text-base text-muted-foreground">Your key performance indicators</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="animate-spin w-6 h-6 mb-2" />
              <p>Loading your metrics...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
              {dashboardMetrics.map((metric, index) => (
                <div
                  key={index}
                  className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-4 shadow-glass"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-sm font-medium text-muted-foreground">{metric.name}</h3>
                    <div className={cn("w-3 h-3 rounded-full shadow-glow", getStatusColor(metric.status))} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* 🧠 Profile Insights */}
          <div className="mt-8">
            <DocumentIntelligenceCard />
          </div>

          {/* 💬 Feedback Summary */}
          <div className="mt-8">
            <FeedbackSummaryPanel />
          </div>

          {/* 🧬 Health Profile */}
          {profile && (
            <div className="mt-8">
              <HealthProfileViewer profile={profile} />
            </div>
          )}

          {/* 🌳 Yves Tree */}
          <div className="mt-8">
            <YvesTreeTimeline />
          </div>

          {/* 🕓 Last Updated */}
          {lastUpdate && (
            <p className="text-center text-xs text-muted-foreground mt-6">
              Data last updated {new Date(lastUpdate).toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
