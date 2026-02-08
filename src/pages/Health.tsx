import { useState, useEffect } from "react";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { supabase } from "@/integrations/supabase/client";
import { OuraReadinessCard } from "@/components/oura/OuraReadinessCard";
import { OuraSleepCard } from "@/components/oura/OuraSleepCard";
import { OuraActivityCard } from "@/components/oura/OuraActivityCard";
import { OuraHRVCard } from "@/components/oura/OuraHRVCard";
import { TodayActivitySection } from "@/components/dashboard/TodayActivitySection";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { HealthTrendsChart } from "@/components/health/HealthTrendsChart";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { HealthPageSkeleton } from "@/components/LoadingStates";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";

export const Health = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [sleepData, setSleepData] = useState<{
    totalSleep: number | null;
    deepSleep: number | null;
    remSleep: number | null;
    lightSleep: number | null;
    efficiency: number | null;
  }>({
    totalSleep: null,
    deepSleep: null,
    remSleep: null,
    lightSleep: null,
    efficiency: null,
  });

  // Layout customization
  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    previewMode,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    toggleCollapseByDefault,
    togglePreviewMode,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization('health');

  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const { data: session, isLoading, refetch } = useWearableSessions(userId || undefined);

  console.log("✅ Health page Oura data:", session);

  // Fetch sleep stage data
  useEffect(() => {
    const fetchSleepData = async () => {
      if (!userId || !session?.date) return;

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("total_sleep_duration, deep_sleep_duration, rem_sleep_duration, light_sleep_duration, sleep_efficiency")
        .eq("user_id", userId)
        .eq("date", session.date)
        .maybeSingle();

      if (error) {
        console.error("Error fetching sleep data:", error);
        return;
      }

      if (data) {
        setSleepData({
          totalSleep: data.total_sleep_duration ? data.total_sleep_duration / 60 : null,
          deepSleep: data.deep_sleep_duration ? data.deep_sleep_duration / 60 : null,
          remSleep: data.rem_sleep_duration ? data.rem_sleep_duration / 60 : null,
          lightSleep: data.light_sleep_duration ? data.light_sleep_duration / 60 : null,
          efficiency: data.sleep_efficiency,
        });
      }
    };

    fetchSleepData();
  }, [userId, session?.date]);

  // Show loading skeleton while user is being fetched
  if (userId === null || (userId && isLoading)) {
    return (
      <div className="min-h-screen bg-background">
        <HealthPageSkeleton />
      </div>
    );
  }

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Refreshed",
        description: "Health data has been updated",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh health data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const healthContent = (
    <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-7xl">
        {/* Header */}
        <LayoutBlock
          blockId="header"
          displayName="Header"
          pageId="health"
          size="wide"
          visible={isSectionVisible('header')}
        >
          <div className="text-center mb-6 md:mb-8 animate-fade-in">
            <div className="flex justify-end mb-2">
              <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Ōura Ring Metrics</h1>
            <p className="text-sm md:text-base text-muted-foreground mb-4">
              Real time health and wellness data from your Ōura Ring
            </p>
            <div className="flex justify-center">
              <OuraSyncStatus />
            </div>
          </div>
        </LayoutBlock>

        {/* Layout Editor */}
        {isLayoutEditing && (
          <div className="mb-8 animate-fade-in">
            <LayoutEditor
              sections={editingSections}
              previewMode={previewMode}
              onSave={saveLayout}
              onCancel={closeLayoutEditor}
              onReset={resetToDefault}
              onToggleVisibility={toggleSectionVisibility}
              onToggleCollapseByDefault={toggleCollapseByDefault}
              onTogglePreviewMode={togglePreviewMode}
              onMoveUp={moveSectionUp}
              onMoveDown={moveSectionDown}
              onReorder={reorderSections}
            />
          </div>
        )}

        {!userId ? (
          <div className="text-center py-12 px-4 bg-glass backdrop-blur-xl border border-glass-border rounded-2xl">
            <p className="text-muted-foreground mb-4">Please log in to view your Ōura Ring data</p>
            <p className="text-sm text-muted-foreground">Connect your account to see your metrics</p>
          </div>
        ) : (
          <>
            {/* No Data Alert */}
            {!isLoading && !session && (
              <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
                <InfoIcon className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-500">No Oura Data Yet</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground">
                  <p className="mb-2">Your Oura Ring is connected, but no data has synced yet. Here's what to do:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Wear your Oura Ring tonight</li>
                    <li>Open the Oura mobile app in the morning to sync</li>
                    <li>Return here and click "Update Now" after 8 AM local time</li>
                  </ol>
                  <p className="mt-3 text-xs">
                    💡 <strong>Tip:</strong> Sleep data processes around 8 AM. Activity data updates throughout the day.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Three Main Score Cards */}
            <LayoutBlock
              blockId="scoreCards"
              displayName="Score Cards"
              pageId="health"
              size="wide"
              visible={isSectionVisible('scoreCards')}
              className="mb-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <OuraReadinessCard
                  score={session?.readiness_score ?? null}
                  restingHR={session?.resting_hr ?? null}
                  hrv={session?.hrv_avg ?? null}
                  isLoading={isLoading}
                />
                <OuraSleepCard
                  score={session?.sleep_score ?? null}
                  totalSleep={sleepData.totalSleep}
                  deepSleep={sleepData.deepSleep}
                  remSleep={sleepData.remSleep}
                  lightSleep={sleepData.lightSleep}
                  efficiency={sleepData.efficiency}
                  isLoading={isLoading}
                />
                <OuraActivityCard
                  score={session?.activity_score ?? null}
                  steps={session?.total_steps ?? null}
                  activeCalories={session?.active_calories ?? null}
                  totalCalories={session?.total_calories ?? null}
                  isLoading={isLoading}
                />
              </div>
            </LayoutBlock>

            {/* Health Trends Chart */}
            <LayoutBlock
              blockId="healthTrends"
              displayName="Health Trends"
              pageId="health"
              size="wide"
              visible={isSectionVisible('healthTrends')}
              className="mb-8"
            >
              <HealthTrendsChart />
            </LayoutBlock>

            {/* Detailed Metrics Section */}
            <LayoutBlock
              blockId="detailedMetrics"
              displayName="Detailed Metrics"
              pageId="health"
              size="wide"
              visible={isSectionVisible('detailedMetrics')}
              className="mb-8"
            >
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-foreground">Detailed Metrics</h2>

                {/* HRV & Heart Rate Card */}
                <OuraHRVCard
                  hrv={session?.hrv_avg ?? null}
                  restingHR={session?.resting_hr ?? null}
                  spo2={session?.spo2_avg ?? null}
                  isLoading={isLoading}
                />
              </div>
            </LayoutBlock>

            {/* Today's Activity Section */}
            <LayoutBlock
              blockId="todayActivity"
              displayName="Today Activity"
              pageId="health"
              size="wide"
              visible={isSectionVisible('todayActivity')}
              className="mb-8"
            >
              <TodayActivitySection />
            </LayoutBlock>

            {/* Data Source Info */}
            <LayoutBlock
              blockId="dataSource"
              displayName="Data Source Info"
              pageId="health"
              size="wide"
              visible={isSectionVisible('dataSource') && !!session}
              className="mb-8"
            >
              <div className="bg-glass/50 backdrop-blur-xl border border-glass-border rounded-xl p-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Last updated: {session?.date ? new Date(session.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'} • Source: Ōura Ring
                </p>
              </div>
            </LayoutBlock>
          </>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {healthContent}
        </PullToRefresh>
      ) : (
        healthContent
      )}
    </div>
  );
};
