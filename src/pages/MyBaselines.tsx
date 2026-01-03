import { Activity, TrendingUp } from "lucide-react";
import { ActivityPanel } from "@/components/dashboard/ActivityPanel";
import { WeeklyTrendChart } from "@/components/dashboard/WeeklyTrendChart";
import { DailyHealthPanel } from "@/components/dashboard/DailyHealthPanel";
import { RecoveryPanel } from "@/components/dashboard/RecoveryPanel";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";

export default function MyBaselines() {
  // Layout customization
  const {
    isEditing: isLayoutEditing,
    editingSections,
    isCustomized: layoutCustomized,
    openEditor: openLayoutEditor,
    closeEditor: closeLayoutEditor,
    saveLayout,
    resetToDefault,
    toggleSectionVisibility,
    moveSectionUp,
    moveSectionDown,
    reorderSections,
    isSectionVisible,
  } = useLayoutCustomization('baselines');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-6 pb-32 md:pb-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        {isSectionVisible('header') && (
          <>
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
          </>
        )}

        {/* Layout Editor */}
        {isLayoutEditing && (
          <div className="mb-8 animate-fade-in">
            <LayoutEditor
              sections={editingSections}
              onSave={saveLayout}
              onCancel={closeLayoutEditor}
              onReset={resetToDefault}
              onToggleVisibility={toggleSectionVisibility}
              onMoveUp={moveSectionUp}
              onMoveDown={moveSectionDown}
              onReorder={reorderSections}
            />
          </div>
        )}

        {/* Activity Trends Section */}
        {isSectionVisible('activityTrends') && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activity Trends
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ActivityPanel />
              <WeeklyTrendChart />
            </div>
          </div>
        )}

        {/* Health & Recovery Trends Section */}
        {isSectionVisible('healthRecovery') && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Health and Recovery Trends
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyHealthPanel />
              <RecoveryPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
