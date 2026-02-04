import { useEffect, useState, useRef } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { YvesRecommendationsCard } from "@/components/dashboard/YvesRecommendationsCard";
import { DailyBriefingCard } from "@/components/dashboard/DailyBriefingCard";
import { BriefingDiagnostics } from "@/components/dashboard/BriefingDiagnostics";
import { PersonalizationInsights } from "@/components/dashboard/PersonalizationInsights";
import { RiskScoreCard } from "@/components/dashboard/RiskScoreCard";
import { useRefreshTrends } from "@/hooks/useTrendData";
import { supabase } from "@/integrations/supabase/client";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";
import { useToast } from "@/hooks/use-toast";
import { useYvesIntelligence } from "@/hooks/useYvesIntelligence";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";

const WelcomeHeader = ({ onCustomize, isCustomized }: { onCustomize: () => void; isCustomized: boolean }) => (
  <div className="text-center mb-8 md:mb-12 space-y-3 md:space-y-4 px-4 md:px-0">
    <div className="flex justify-end mb-2">
      <CustomizeLayoutButton onClick={onCustomize} isCustomized={isCustomized} />
    </div>
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
          <WelcomeHeader onCustomize={openLayoutEditor} isCustomized={layoutCustomized} />

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
                    focusMode="balance"
                  />
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

                {/* Recommendations */}
                <LayoutBlock
                  blockId="recommendations"
                  displayName="Recommendations"
                  pageId="dashboard"
                  size="wide"
                  visible={isSectionVisible('recommendations')}
                  className="mb-10"
                >
                  <YvesRecommendationsCard
                    recommendations={recommendations}
                    isLoading={intelligenceLoading}
                  />
                </LayoutBlock>

                {/* Diagnostics (for troubleshooting) */}
                <LayoutBlock
                  blockId="briefingDiagnostics"
                  displayName="Briefing Diagnostics"
                  pageId="dashboard"
                  size="wide"
                  visible={true}
                  className="mb-6"
                >
                  <BriefingDiagnostics />
                </LayoutBlock>

                {/* Personalization Insights */}
                <LayoutBlock
                  blockId="personalizationInsights"
                  displayName="Personalization Insights"
                  pageId="dashboard"
                  size="wide"
                  visible={true}
                  className="mb-10"
                >
                  <PersonalizationInsights />
                </LayoutBlock>
              </div>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
