import { useEffect, useState, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { YvesRecommendationsCard } from "@/components/dashboard/YvesRecommendationsCard";
import { DailyBriefingCard } from "@/components/dashboard/DailyBriefingCard";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { TodayActivitySection } from "@/components/dashboard/TodayActivitySection";
import { FocusModeSelector } from "@/components/dashboard/FocusModeSelector";
import { CustomFocusEditor } from "@/components/dashboard/CustomFocusEditor";
import { useRefreshTrends } from "@/hooks/useTrendData";
import { supabase } from "@/integrations/supabase/client";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { OuraReadinessCard } from "@/components/oura/OuraReadinessCard";
import { OuraSleepCard } from "@/components/oura/OuraSleepCard";
import { OuraActivityCard } from "@/components/oura/OuraActivityCard";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";
import { useToast } from "@/hooks/use-toast";
import { useYvesIntelligence } from "@/hooks/useYvesIntelligence";
import { useDashboardFocusMode } from "@/hooks/useDashboardFocusMode";
import { cn } from "@/lib/utils";

const WelcomeHeader = () => (
  <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
    <div className="animate-fade-in-slow">
      <h1 className="text-xl md:text-2xl font-light text-muted-foreground mb-1 md:mb-2">Hello,</h1>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Athlete</h2>
    </div>
    <div className="animate-slide-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
      <p className="text-muted-foreground text-base md:text-lg">Here's your training overview for today</p>
    </div>
    <div className="flex justify-center animate-fade-in" style={{ animationDelay: "0.3s" }}>
      <OuraSyncStatus />
    </div>
  </div>
);

export const Dashboard = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const { refreshAll } = useRefreshTrends();
  const { isConnected, isLoading: tokenLoading } = useOuraTokenStatus();
  const { toast } = useToast();
  const hasShownConnectionToast = useRef(false);
  
  // Focus Mode for dashboard presentation
  const {
    currentMode,
    setMode,
    allModes,
    isCardEmphasized,
    isCardMinimized,
    getCardOrder,
    // Custom mode
    isEditingCustom,
    openCustomEditor,
    saveCustomCardPreferences,
    cancelCustomEditing,
    getCardPreferencesForEditor,
    hasCustomPreferences,
  } = useDashboardFocusMode();
  
  // Unified Yves Intelligence - single source of truth for briefing & recommendations
  const {
    dailyBriefing,
    recommendations,
    content: briefingContent,
    createdAt: briefingCreatedAt,
    isLoading: intelligenceLoading,
    isGenerating: intelligenceGenerating,
    cached: intelligenceCached,
    refresh: refreshIntelligence,
  } = useYvesIntelligence();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  // Show confirmation toast ONCE when Oura Ring connection is detected
  useEffect(() => {
    if (!tokenLoading && isConnected && !hasShownConnectionToast.current) {
      hasShownConnectionToast.current = true;
      toast({
        title: "Oura Ring Connected",
        description: "Your data syncs automatically in the background",
      });
    }
  }, [isConnected, tokenLoading, toast]);

  const { data: session, isLoading } = useWearableSessions(userId || undefined);

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
            setTimeout(() => refreshAll(), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

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
              {/* Focus Mode Selector */}
              <div className="mb-8 p-4 bg-glass backdrop-blur-xl border border-glass-border rounded-xl">
                <FocusModeSelector
                  currentMode={currentMode}
                  allModes={allModes}
                  onModeChange={setMode}
                  onEditCustom={openCustomEditor}
                  hasCustomPreferences={hasCustomPreferences}
                />
              </div>

              {/* Custom Focus Editor */}
              {isEditingCustom && (
                <div className="mb-8 animate-fade-in">
                  <CustomFocusEditor
                    cardPreferences={getCardPreferencesForEditor()}
                    onSave={saveCustomCardPreferences}
                    onCancel={cancelCustomEditing}
                  />
                </div>
              )}

              {/* Dashboard Cards - Ordered by Focus Mode */}
              <div className="space-y-8">
                {/* Risk Score */}
                <div 
                  className={cn(
                    "transition-all duration-300",
                    isCardMinimized('risk') && "opacity-60 scale-[0.98]",
                    isCardEmphasized('risk') && "ring-2 ring-primary/30 rounded-xl"
                  )}
                  style={{ order: getCardOrder('risk') }}
                >
                  <RiskScoreCard />
                </div>

                {/* Core Metrics: Sleep, Readiness, Activity */}
                <div className={cn(
                  "transition-all duration-300",
                  isCardMinimized('readiness') && isCardMinimized('sleep') && isCardMinimized('activity') && "opacity-60"
                )}>
                  <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4">Today's Scores</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={cn(
                      "transition-all duration-300",
                      isCardEmphasized('readiness') && "ring-2 ring-primary/30 rounded-xl",
                      isCardMinimized('readiness') && "opacity-60 scale-[0.98]"
                    )}>
                      <OuraReadinessCard
                        score={session?.readiness_score ?? null}
                        restingHR={session?.resting_hr ?? null}
                        hrv={session?.hrv_avg ?? null}
                        isLoading={isLoading}
                      />
                    </div>
                    <div className={cn(
                      "transition-all duration-300",
                      isCardEmphasized('sleep') && "ring-2 ring-emerald-500/30 rounded-xl",
                      isCardMinimized('sleep') && "opacity-60 scale-[0.98]"
                    )}>
                      <OuraSleepCard
                        score={session?.sleep_score ?? null}
                        totalSleep={null}
                        deepSleep={null}
                        remSleep={null}
                        lightSleep={null}
                        efficiency={null}
                        isLoading={isLoading}
                      />
                    </div>
                    <div className={cn(
                      "transition-all duration-300",
                      isCardEmphasized('activity') && "ring-2 ring-primary/30 rounded-xl",
                      isCardMinimized('activity') && "opacity-60 scale-[0.98]"
                    )}>
                      <OuraActivityCard
                        score={session?.activity_score ?? null}
                        steps={session?.total_steps ?? null}
                        activeCalories={session?.active_calories ?? null}
                        totalCalories={session?.total_calories ?? null}
                        isLoading={isLoading}
                      />
                    </div>
                  </div>
                </div>

                {/* Today's Activity Section */}
                <div className={cn(
                  "transition-all duration-300",
                  isCardMinimized('todayActivity') && "opacity-60 scale-[0.98]",
                  isCardEmphasized('todayActivity') && "ring-2 ring-primary/30 rounded-xl"
                )}>
                  <TodayActivitySection />
                </div>

                {/* Daily Briefing */}
                <div className={cn(
                  "transition-all duration-300",
                  isCardMinimized('briefing') && "opacity-60 scale-[0.98]",
                  isCardEmphasized('briefing') && "ring-2 ring-blue-500/30 rounded-xl"
                )}>
                  <DailyBriefingCard
                    briefing={dailyBriefing}
                    content={briefingContent}
                    createdAt={briefingCreatedAt}
                    isLoading={intelligenceLoading}
                    isGenerating={intelligenceGenerating}
                    cached={intelligenceCached}
                    onRefresh={refreshIntelligence}
                  />
                </div>

                {/* Recommendations */}
                <div className={cn(
                  "mb-10 transition-all duration-300",
                  isCardMinimized('recommendations') && "opacity-60 scale-[0.98]",
                  isCardEmphasized('recommendations') && "ring-2 ring-blue-500/30 rounded-xl"
                )}>
                  <YvesRecommendationsCard
                    recommendations={recommendations}
                    isLoading={intelligenceLoading}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};