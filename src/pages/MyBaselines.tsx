import { useState, useEffect } from "react";
import { Activity, TrendingUp } from "lucide-react";
import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { WeeklyTrendChart } from "@/components/dashboard/WeeklyTrendChart";
import { DailyHealthPanel } from "@/components/dashboard/DailyHealthPanel";
import { RecoveryPanel } from "@/components/dashboard/RecoveryPanel";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { supabase } from "@/integrations/supabase/client";

export default function MyBaselines() {
  const [hasData, setHasData] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setHasData(false); return; }
      const { count } = await supabase
        .from("training_trends")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setHasData((count ?? 0) > 0);
    })();
  }, []);
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
  } = useLayoutCustomization('baselines');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 pb-32 md:pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Empty state */}
        {hasData === false && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp className="w-8 h-8 text-primary/60" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">No baselines yet</h2>
            <p className="text-muted-foreground max-w-sm">
              Your baselines will appear after 7 days of wearable data. Keep wearing your device!
            </p>
          </div>
        )}

        {/* Header */}
        <LayoutBlock
          blockId="header"
          displayName="Header"
          pageId="baselines"
          size="wide"
          visible={isSectionVisible('header')}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Activity and Trends</h1>
            </div>
            <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
          </div>
          <p className="text-muted-foreground mb-8">
            Track your activity patterns, recovery trends, and weekly performance.
          </p>
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

        {/* Activity Trends Section */}
        <LayoutBlock
          blockId="activityTrends"
          displayName="Activity Trends"
          pageId="baselines"
          size="wide"
          visible={isSectionVisible('activityTrends')}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Activity Trends
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityPanel />
            <WeeklyTrendChart />
          </div>
        </LayoutBlock>

        {/* Health & Recovery Trends Section */}
        <LayoutBlock
          blockId="healthRecovery"
          displayName="Health and Recovery"
          pageId="baselines"
          size="wide"
          visible={isSectionVisible('healthRecovery')}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Health and Recovery Trends
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DailyHealthPanel />
            <RecoveryPanel />
          </div>
        </LayoutBlock>
      </div>
    </div>
  );
}
