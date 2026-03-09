import { useEffect, useState, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { DailyBriefingCard } from "@/components/dashboard/DailyBriefingCard";
import { BriefingDiagnostics } from "@/components/dashboard/BriefingDiagnostics";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { QuickActionsPanel } from "@/components/dashboard/QuickActionsPanel";
import { useRefreshTrends } from "@/hooks/useTrendData";
import { supabase } from "@/integrations/supabase/client";
import { ReturnToSportCard } from "@/components/dashboard/ReturnToSportCard";
import { BaselineProgressCard } from "@/components/dashboard/BaselineProgressCard";
import { useInjuryProfile } from "@/hooks/useInjuryProfile";
import { useDataMaturity } from "@/hooks/useDataMaturity";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";
import { useToast } from "@/hooks/use-toast";
import { useYvesIntelligence } from "@/hooks/useYvesIntelligence";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { DashboardSkeleton } from "@/components/LoadingStates";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { HealthAnomalyBanner } from "@/components/dashboard/HealthAnomalyBanner";
import { useGarminTokenStatus } from "@/hooks/useGarminTokenStatus";
import { GarminExpiredBanner } from "@/components/GarminExpiredBanner";
import { GettingStartedChecklist } from "@/components/dashboard/GettingStartedChecklist";

const WelcomeHeader = ({
  onCustomize,
  isCustomized,
  userName,
  isLoadingProfile
}: {
  onCustomize: () => void;
  isCustomized: boolean;
  userName: string | null;
  isLoadingProfile: boolean;
}) => (
  <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
    <div className="flex justify-end mb-2">
      <CustomizeLayoutButton onClick={onCustomize} isCustomized={isCustomized} />
    </div>
    <div className="animate-fade-in-slow">
      <h1 className="text-xl md:text-2xl font-light text-muted-foreground mb-1 md:mb-2">Hello,</h1>
      <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
        {isLoadingProfile ? '...' : (userName || 'Athlete')}
      </h2>
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
  const [userName, setUserName] = useState<string | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const { refreshAll } = useRefreshTrends();
  const { isConnected, isLoading: tokenLoading } = useOuraTokenStatus();
  const { toast } = useToast();
  const hasShownConnectionToast = useRef(false);
  const isMobile = useIsMobile();
  
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
  } = useLayoutCustomization('dashboard');
  
  const { profile: injuryProfile } = useInjuryProfile();
  const dataMaturity = useDataMaturity();
  const { isExpired: garminTokenExpired } = useGarminTokenStatus();

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
  } = useYvesIntelligence('balance');

  // Check debug mode from localStorage
  useEffect(() => {
    const checkDebugMode = () => {
      const debugEnabled = localStorage.getItem('debugMode') === 'true';
      setDebugMode(debugEnabled);
    };

    checkDebugMode();

    // Listen for storage changes (when user toggles in Settings)
    window.addEventListener('storage', checkDebugMode);

    // Also listen for custom event for same-window updates
    window.addEventListener('debugModeChanged', checkDebugMode);

    return () => {
      window.removeEventListener('storage', checkDebugMode);
      window.removeEventListener('debugModeChanged', checkDebugMode);
    };
  }, []);

  // Fetch user ID and profile name
  useEffect(() => {
    async function fetchUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingProfile(false);
          return;
        }

        setUserId(user.id);

        // Fetch name from user_profiles (written by ProfileSettings and onboarding)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0]);
        } else {
          // Fallback 1: user_profile.name written by onboarding
          const { data: userProfile } = await supabase
            .from('user_profile')
            .select('name')
            .eq('user_id', user.id)
            .maybeSingle();

          if (userProfile?.name) {
            setUserName(userProfile.name.split(' ')[0]);
          } else {
            // Fallback 2: auth user metadata (Google OAuth / email sign-up)
            const metaName: string | undefined =
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.user_metadata?.display_name ||
              user.user_metadata?.username;
            if (metaName) {
              setUserName(metaName.split(' ')[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    fetchUserProfile();
  }, []);

  // Show confirmation toast ONCE when wearable connection is detected
  useEffect(() => {
    if (!tokenLoading && isConnected && !hasShownConnectionToast.current) {
      hasShownConnectionToast.current = true;
      toast({
        title: "Wearable Connected",
        description: "Your data syncs automatically in the background",
      });
    }
  }, [isConnected, tokenLoading, toast]);

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
            setTimeout(() => refreshAll(), 2000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshAll]);

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshAll(),
        refreshIntelligence()
      ]);
      toast({
        title: "Refreshed",
        description: "Dashboard data has been updated",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const   dashboardContent = (
    <div className="container mx-auto px-4 md:px-6 pt-4 sm:pt-6 md:pt-8 pb-4 overflow-x-hidden">
          <WelcomeHeader
            onCustomize={openLayoutEditor}
            isCustomized={layoutCustomized}
            userName={userName}
            isLoadingProfile={isLoadingProfile}
          />

          {/* Garmin token expired warning */}
          {garminTokenExpired && (
            <GarminExpiredBanner
              className="mb-6"
              onReconnect={() => window.dispatchEvent(new CustomEvent("navigate-tab", { detail: "settings" }))}
            />
          )}

          {/* Getting Started Checklist — hidden once all steps complete */}
          <GettingStartedChecklist
            onNavigate={(tab) =>
              window.dispatchEvent(new CustomEvent("navigate-tab", { detail: tab }))
            }
          />

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
              <p className="text-muted-foreground mb-4">Please log in to view your wearable data</p>
              <p className="text-sm text-muted-foreground">Connect your account to see your metrics</p>
            </div>
          ) : (
            <>
              {/* Baseline Progress — visible until user has 28 days of data */}
              {dataMaturity.tier !== 'ready' && !dataMaturity.isLoading && (
                <LayoutBlock
                  blockId="baselineProgress"
                  displayName="Baseline Progress"
                  pageId="dashboard"
                  size="wide"
                  visible={true}
                >
                  <div className="mb-6">
                    <BaselineProgressCard
                      maturity={dataMaturity}
                      onSyncComplete={dataMaturity.refetch}
                    />
                  </div>
                </LayoutBlock>
              )}

              {/* Return to Sport Card — visible only when an active injury exists */}
              {injuryProfile && (
                <LayoutBlock
                  blockId="returnToSport"
                  displayName="Return to Sport"
                  pageId="dashboard"
                  size="wide"
                  visible={true}
                >
                  <div className="mb-8">
                    <ReturnToSportCard profile={injuryProfile} />
                  </div>
                </LayoutBlock>
              )}

              {/* Health Anomaly Banner — shows when an unacknowledged high/critical anomaly exists */}
              <HealthAnomalyBanner />

              {/* Daily Briefing - Now at the top */}
              <LayoutBlock
                blockId="dailyBriefing"
                displayName="Daily Briefing"
                pageId="dashboard"
                size="wide"
                visible={isSectionVisible('dailyBriefing')}
              >
                <div className="mb-8 transition-all duration-300">
                  <DailyBriefingCard
                    briefing={dailyBriefing}
                    content={briefingContent}
                    createdAt={briefingCreatedAt}
                    isLoading={intelligenceLoading}
                    isGenerating={intelligenceGenerating}
                    cached={intelligenceCached}
                    onRefresh={refreshIntelligence}
                    dataMaturityTier={dataMaturity.tier}
                    dataMaturityDays={dataMaturity.days_with_data}
                    recommendations={recommendations}
                  />
                </div>
              </LayoutBlock>

              {/* Quick Actions Panel */}
              <LayoutBlock
                blockId="quickActions"
                displayName="Quick Actions"
                pageId="dashboard"
                size="wide"
                visible={isSectionVisible('quickActions')}
              >
                <div className="mb-8 transition-all duration-300">
                  <QuickActionsPanel />
                </div>
              </LayoutBlock>

              {/* Dashboard Cards */}
              <div className="space-y-8">
                {/* Risk Score */}
                <LayoutBlock
                  blockId="riskScore"
                  displayName="Risk Score"
                  pageId="dashboard"
                  size="wide"
                  visible={isSectionVisible('riskScore')}
                >
                  <RiskScoreCard />
                </LayoutBlock>

                {/* Recommendations - Now integrated into Daily Briefing Card */}

                {/* Diagnostics (for troubleshooting - only visible in debug mode) */}
                {debugMode && (
                  <LayoutBlock
                    blockId="briefingDiagnostics"
                    displayName="Briefing Diagnostics"
                    pageId="dashboard"
                    size="wide"
                    visible={debugMode}
                    className="mb-6"
                  >
                    <BriefingDiagnostics />
                  </LayoutBlock>
                )}

              </div>
            </>
          )}
    </div>
  );

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex flex-col pb-nav-safe">
        {isMobile ? (
          <PullToRefresh onRefresh={handleRefresh}>
            {dashboardContent}
          </PullToRefresh>
        ) : (
          dashboardContent
        )}
      </div>
    </TooltipProvider>
  );
};
