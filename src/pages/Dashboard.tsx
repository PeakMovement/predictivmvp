import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { DocumentIntelligenceCard } from "@/components/dashboard/DocumentIntelligenceCard";
import { FeedbackSummaryPanel } from "@/components/dashboard/FeedbackSummaryPanel";
import { HealthProfileViewer } from "@/components/health/HealthProfileViewer";
import { YvesTreeTimeline } from "@/components/dashboard/YvesTreeTimeline";
import { YvesRecommendationsCard } from "@/components/dashboard/YvesRecommendationsCard";
import { DailyBriefingCard } from "@/components/dashboard/DailyBriefingCard";
import { DailyHealthPanel } from "@/components/dashboard/DailyHealthPanel";
import { RecoveryPanel } from "@/components/dashboard/RecoveryPanel";
import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { WeeklyTrendChart } from "@/components/dashboard/WeeklyTrendChart";
import { TrendRefreshButton } from "@/components/dashboard/TrendRefreshButton";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { useRefreshTrends } from "@/hooks/useTrendData";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
    <div className="animate-fade-in-slow">
      <h1 className="text-xl md:text-2xl font-light text-muted-foreground mb-1 md:mb-2">Hello,</h1>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Athlete</h2>
    </div>
    <div className="animate-slide-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
      <p className="text-muted-foreground text-base md:text-lg">Here's your training overview for today</p>
    </div>
    <div className="flex justify-center gap-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <OuraSyncStatus />
      <TrendRefreshButton />
    </div>
  </div>
);

export const Dashboard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const { profile } = useHealthProfile();
  const { refreshAll } = useRefreshTrends();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  // Listen for sync events and refresh trends
  useEffect(() => {
    const channel = supabase
      .channel("oura-sync-refresh")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "oura_logs",
        },
        (payload) => {
          if (payload.new && (payload.new as any).status === "success") {
            console.log("Oura sync completed, refreshing trends...");
            // Small delay to allow trend calculation to complete
            setTimeout(() => refreshAll(), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  const { data: session, isLoading } = useWearableSessions(userId || undefined);

  const dashboardMetrics = session
    ? [
        { name: "Readiness", value: session.readiness_score ?? "—", status: "green" },
        { name: "Sleep", value: session.sleep_score ?? "—", status: "green" },
        { name: "Activity", value: session.activity_score ?? "—", status: "green" },
        { name: "Steps", value: session.total_steps ?? "—", status: "green" },
        { name: "Calories", value: session.active_calories ?? "—", status: "green" },
      ]
    : [];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex flex-col pb-24 md:pb-32">
        <div className="flex-grow container mx-auto px-4 md:px-6 pt-6 md:pt-8">
          <WelcomeHeader />

          {!userId ? (
            <div className="text-center py-12 px-4 bg-glass backdrop-blur-xl border border-glass-border rounded-2xl">
              <p className="text-muted-foreground mb-4">Please log in to view your Ōura Ring data</p>
              <p className="text-sm text-muted-foreground">Connect your account to see your metrics</p>
            </div>
          ) : (
            <>
              {/* Today's Metrics - Quick Glance */}
              <div className="text-center mb-6 md:mb-8 animate-fade-in">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1 md:mb-2">Today's Metrics</h3>
                <p className="text-sm md:text-base text-muted-foreground">Your key performance indicators</p>
              </div>

              {isLoading ? (
                <p className="text-center text-muted-foreground">Loading live metrics...</p>
              ) : dashboardMetrics.length === 0 ? (
                <div className="text-center py-8 px-4 bg-glass backdrop-blur-xl border border-glass-border rounded-2xl">
                  <p className="text-muted-foreground mb-2">No Ōura Ring data found yet</p>
                  <p className="text-sm text-muted-foreground">Connect your Ōura Ring above and sync to start tracking your training metrics</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                  {dashboardMetrics.map((metric, i) => (
                    <div
                      key={i}
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

              {/* Health Trends Section */}
              <div className="mb-8">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4">Health Trends</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <DailyHealthPanel />
                  <RecoveryPanel />
                </div>
              </div>

              {/* Activity & Weekly Trends */}
              <div className="mb-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ActivityPanel />
                  <WeeklyTrendChart />
                </div>
              </div>

              {/* Daily Briefing */}
              <div className="mt-8">
                <DailyBriefingCard />
              </div>

              {/* Recommendations */}
              <div className="mt-8">
                <YvesRecommendationsCard />
              </div>

              {/* Document Intelligence */}
              <div className="mt-8">
                <DocumentIntelligenceCard onNavigate={() => {}} />
              </div>

              {/* Feedback */}
              <div className="mt-8">
                <FeedbackSummaryPanel />
              </div>

              {/* Health Profile */}
              {profile && (
                <div className="mt-8">
                  <HealthProfileViewer profile={profile} />
                </div>
              )}

              {/* Yves Timeline */}
              <div className="mt-8 mb-10">
                <YvesTreeTimeline />
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};