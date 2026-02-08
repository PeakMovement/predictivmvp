import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Settings2, Check } from 'lucide-react';
import { usePersonalCanvas, blockLibrary } from '@/hooks/usePersonalCanvas';
import { BlockLibrary } from '@/components/canvas/BlockLibrary';
import { CanvasBlockRenderer } from '@/components/canvas/CanvasBlockRenderer';
import { CanvasEmptyState } from '@/components/canvas/CanvasEmptyState';
import { Skeleton } from '@/components/ui/skeleton';

// Import block components from their respective pages
import { RiskScoreCard } from '@/components/dashboard/RiskScoreCard';
import { DailyBriefingCard } from '@/components/dashboard/DailyBriefingCard';
import { TodayActivitySection } from '@/components/dashboard/TodayActivitySection';
import { YvesRecommendationsCard } from '@/components/dashboard/YvesRecommendationsCard';
import { TrendCarousel } from '@/components/trends/TrendCarousel';
import { SessionLogList } from '@/components/dashboard/SessionLogList';
import { WeeklyTrendChart } from '@/components/dashboard/WeeklyTrendChart';
import { DocumentUploadZone } from '@/components/documents/DocumentUploadZone';

// Map of source blocks to their components
const blockComponents: Record<string, Record<string, React.ComponentType<unknown>>> = {
  dashboard: {
    riskScore: RiskScoreCard as React.ComponentType<unknown>,
    todaysScores: TrendCarousel as React.ComponentType<unknown>,
    dailyBriefing: DailyBriefingCard as React.ComponentType<unknown>,
    todayActivity: TodayActivitySection as React.ComponentType<unknown>,
    recommendations: YvesRecommendationsCard as React.ComponentType<unknown>,
  },
  training: {
    sessionLogs: SessionLogList as React.ComponentType<unknown>,
    gauges: WeeklyTrendChart as React.ComponentType<unknown>,
    trendAnalysis: WeeklyTrendChart as React.ComponentType<unknown>,
  },
  health: {
    scoreCards: TrendCarousel as React.ComponentType<unknown>,
    detailedMetrics: WeeklyTrendChart as React.ComponentType<unknown>,
  },
  plan: {
    weekIntent: DailyBriefingCard as React.ComponentType<unknown>,
    weeklyFocus: DailyBriefingCard as React.ComponentType<unknown>,
    themes: DailyBriefingCard as React.ComponentType<unknown>,
    dailyBriefings: DailyBriefingCard as React.ComponentType<unknown>,
  },
  docs: {
    summary: DailyBriefingCard as React.ComponentType<unknown>,
    library: DocumentUploadZone as React.ComponentType<unknown>,
  },
  profile: {
    wearables: DailyBriefingCard as React.ComponentType<unknown>,
  },
  baselines: {
    activityTrends: WeeklyTrendChart as React.ComponentType<unknown>,
    healthRecovery: WeeklyTrendChart as React.ComponentType<unknown>,
  },
};

export default function PersonalCanvas() {
  const {
    blocks,
    isEditing,
    isLibraryOpen,
    isLoading,
    hasBlocks,
    setIsEditing,
    setIsLibraryOpen,
    addBlock,
    removeBlock,
    moveBlockUp,
    moveBlockDown,
    resizeBlock,
    toggleBlockVisibility,
  } = usePersonalCanvas();

  const visibleBlocks = useMemo(() => {
    return blocks.filter(b => b.visible || isEditing);
  }, [blocks, isEditing]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasBlocks) {
    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <CanvasEmptyState onOpenLibrary={() => setIsLibraryOpen(true)} />
        <BlockLibrary
          open={isLibraryOpen}
          onOpenChange={setIsLibraryOpen}
          onAddBlock={addBlock}
          existingBlocks={blocks}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Your Canvas</h1>
              <p className="text-sm text-muted-foreground">
                Your personalized overview, always in sync
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLibraryOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
              <Button
                variant={isEditing ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="gap-2"
              >
                {isEditing ? (
                  <>
                    <Check className="h-4 w-4" />
                    Done
                  </>
                ) : (
                  <>
                    <Settings2 className="h-4 w-4" />
                    Customize
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas Content */}
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {visibleBlocks.map((block, index) => {
            const Component = blockComponents[block.sourcePageId]?.[block.sourceSectionId];
            
            if (!Component) {
              return (
                <CanvasBlockRenderer
                  key={block.id}
                  block={block}
                  isEditing={isEditing}
                  onRemove={() => removeBlock(block.id)}
                  onMoveUp={() => moveBlockUp(block.id)}
                  onMoveDown={() => moveBlockDown(block.id)}
                  onResize={(size) => resizeBlock(block.id, size)}
                  onToggleVisibility={() => toggleBlockVisibility(block.id)}
                  isFirst={index === 0}
                  isLast={index === visibleBlocks.length - 1}
                >
                  <div className="bg-card border border-border rounded-xl p-6">
                    <p className="text-muted-foreground text-center">
                      {block.name} section
                    </p>
                  </div>
                </CanvasBlockRenderer>
              );
            }

            return (
              <CanvasBlockRenderer
                key={block.id}
                block={block}
                isEditing={isEditing}
                onRemove={() => removeBlock(block.id)}
                onMoveUp={() => moveBlockUp(block.id)}
                onMoveDown={() => moveBlockDown(block.id)}
                onResize={(size) => resizeBlock(block.id, size)}
                onToggleVisibility={() => toggleBlockVisibility(block.id)}
                isFirst={index === 0}
                isLast={index === visibleBlocks.length - 1}
              >
                <Component />
              </CanvasBlockRenderer>
            );
          })}
        </div>
      </div>

      {/* Block Library Dialog */}
      <BlockLibrary
        open={isLibraryOpen}
        onOpenChange={setIsLibraryOpen}
        onAddBlock={addBlock}
        existingBlocks={blocks}
      />
    </div>
  );
}
