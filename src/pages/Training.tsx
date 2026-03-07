import { ChartBar as BarChart3, Activity, Calendar, TrendingUp, Gauge, ChevronLeft, ChevronRight, FileText, Play, CircleCheck as CheckCircle, CircleHelp as HelpCircle, Check, X, CalendarPlus, WifiOff } from "lucide-react";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import React from "react";
import { format } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { HealthDataRow, getHealthData } from "@/lib/healthDataStore";
import { UnifiedTrendCard } from "@/components/trends/UnifiedTrendCard";
import { supabase } from "@/integrations/supabase/client";
import { useTrainingTrends } from "@/hooks/useTrainingTrends";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { useGarminRunningDistance } from "@/hooks/useGarminRunningDistance";
import { SessionLogList } from "@/components/dashboard/SessionLogList";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { AccountabilityChallenges } from "@/components/training/AccountabilityChallenges";
import { TrainingCalendar } from "@/components/training/TrainingCalendar";
import { SessionComparison } from "@/components/training/SessionComparison";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { DeviceSourceSwitcher } from "@/components/DeviceSourceSwitcher";

const generateSuggestions = (csvData: HealthDataRow[]) => {
  if (csvData.length === 0) return [];
  const currentData = csvData[csvData.length - 1];
  if (!currentData) return [];
  const suggestions = [];
  const hrv = parseFloat(currentData.HRV || "0");
  const acwr = parseFloat(currentData.ACWR || "0");
  const monotony = parseFloat(currentData.Monotony || "0");
  const sleepHours = parseFloat(currentData.SleepHours || "0");
  const sleepScore = parseFloat(currentData.SleepScore || "0");
  const strain = parseFloat(currentData.Strain || "0");
  if (hrv < 65)
    suggestions.push({
      id: 1,
      text: "Your HRV is below optimal. Add 2 mobility sessions focusing on recovery.",
      type: "actionable",
      category: "Recovery",
      accentColor: "yellow",
      hasVideo: true,
      hasPdf: true,
    });
  if (acwr > 1.5)
    suggestions.push({
      id: 2,
      text: "Overload risk detected. Schedule a deload week to reduce training intensity by 20%.",
      type: "actionable",
      category: "Training",
      accentColor: "red",
      hasVideo: true,
      hasPdf: true,
    });
  if (sleepHours >= 7 && sleepScore > 80)
    suggestions.push({
      id: 3,
      text: "Excellent recovery! This is a great day for a high intensity performance session.",
      type: "actionable",
      category: "Training",
      accentColor: "green",
      hasVideo: true,
      hasPdf: false,
    });
  if (monotony > 2.0)
    suggestions.push({
      id: 4,
      text: "Training is too repetitive. Add varied training modalities this week.",
      type: "actionable",
      category: "Training",
      accentColor: "yellow",
      hasVideo: false,
      hasPdf: true,
    });
  if (strain > 150)
    suggestions.push({
      id: 5,
      text: "Strain is elevated. Consider adding an extra recovery day this week.",
      type: "actionable",
      category: "Recovery",
      accentColor: "red",
      hasVideo: true,
      hasPdf: true,
    });
  if (acwr >= 0.8 && acwr <= 1.3 && hrv >= 65)
    suggestions.push({
      id: 6,
      text: "Your acute:chronic ratio suggests optimal adaptation window. Great progress!",
      type: "insight",
      category: "Insight",
      accentColor: "green",
      hasVideo: false,
      hasPdf: false,
    });
  return suggestions;
};

// ✅ AccountabilityChallenges, SessionLogCard, SessionLogList, CircularGauge, GraphCarousel remain unchanged
// (Paste your versions — they do not affect layout alignment)

const SessionLogCard = ({ title, date, load }: { title: string; date: string; load: number }) => (
  <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out transform-gpu">
    <div className="flex items-center justify-between mb-2">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <span className="px-2 py-1 text-xs rounded-lg font-medium bg-blue-500/20 text-blue-400">Training</span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar size={14} />
        <span>{date}</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-primary animate-bounce-subtle" />
        <span className="font-medium text-foreground">{load > 0 ? load.toFixed(0) : "–"}</span>
        <span className="text-muted-foreground text-xs">load</span>
      </div>
    </div>
  </div>
);

const CircularGauge = ({
  title,
  value,
  maxValue,
  unit,
}: {
  title: string;
  value: number;
  maxValue: number;
  unit: string;
}) => {
  const percentage = (value / maxValue) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover:scale-105 hover:-translate-y-1 transition-all duration-300 ease-out animate-fade-in transform-gpu">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
          <Gauge size={16} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
              fill="transparent"
              className="opacity-20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            <span className="text-xs text-muted-foreground">{unit}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ Main Page Component
export const Training = () => {
  const { trends, isLoading: trendsLoading, refresh, userId } = useTrainingTrends({ days: 7 });
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("oura");
  const [isSyncing, setIsSyncing] = useState(false);
  const { data: wearableData, refetch: refetchWearable } = useWearableSessions(userId || undefined, selectedSource);
  const { runningDistance, isEstimated: runningDistanceIsEstimated, isLoading: runningDistanceLoading } = useGarminRunningDistance();
  const [suggestions, setSuggestions] = useState<ReturnType<typeof generateSuggestions>>([]);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonSessions, setComparisonSessions] = useState<any[]>([]);
  const [garminConnected, setGarminConnected] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

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
  } = useLayoutCustomization('training');

  // Find latest trend with non-null monotony/strain
  const latestAvailableTrend = trends?.find(t => t.monotony != null && t.strain != null) || null;
  
  // Calculate Fatigue Index: (Strain / 2000) × 50 + (cappedMonotony / 2.5) × 50, capped at 100
  const fatigueIndex = latestAvailableTrend 
    ? Math.min(100, Math.round(
        (Math.min(latestAvailableTrend.strain || 0, 2000) / 2000) * 50 + 
        (Math.min(latestAvailableTrend.monotony || 0, 2.5) / 2.5) * 50
      ))
    : 0;

  // Detect available device sources from wearable_sessions (real devices only)
  const KNOWN_SOURCES = ["oura", "garmin", "polar"];
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("wearable_sessions")
      .select("source")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (!data) return;
        const unique = [...new Set(data.map((r) => r.source))]
          .filter((s) => KNOWN_SOURCES.includes(s))
          .sort();
        setAvailableSources(unique);
        if (unique.length > 0 && !unique.includes(selectedSource)) {
          setSelectedSource(unique[0]);
        }
      });
  }, [userId]);

  // Check if Garmin token exists (connected but no data)
  useEffect(() => {
    const checkGarmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("wearable_tokens")
        .select("scope")
        .eq("user_id", user.id)
        .eq("scope", "garmin")
        .maybeSingle();
      setGarminConnected(!!data);
    };
    checkGarmin();
  }, []);

  const garminHasData = !trendsLoading && (trends?.length ?? 0) > 0;
  const showGarminPending = garminConnected && !garminHasData && !trendsLoading;

  useEffect(() => {
    const csvData = getHealthData();
    const newSuggestions = generateSuggestions(csvData);
    setSuggestions(newSuggestions);
  }, []);

  // Listen for Ōura data refresh
  useEffect(() => {
    const handleDataRefreshed = () => {
      console.log("[Training] Ōura Ring data refreshed, reloading trends...");
      refresh();
    };

    window.addEventListener("wearable_trends_refresh", handleDataRefreshed);
    return () => window.removeEventListener("wearable_trends_refresh", handleDataRefreshed);
  }, [refresh]);

  const handleCompareRequested = async (session1: any, session2: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch full session data for both sessions
      const fetchSessionData = async (session: any) => {
        const { data } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", session.dateRaw || session.date)
          .maybeSingle();

        if (data) {
          return {
            ...data,
            session_type: session.title,
          };
        }

        // Fallback to session data from list
        return {
          id: Math.random().toString(),
          date: session.dateRaw || session.date,
          session_type: session.title,
          duration_minutes: session.duration || 0,
          calories_burned: session.calories || 0,
          avg_heart_rate: 0,
          training_load: session.load || 0,
          perceived_exertion: 0,
        };
      };

      const fullSession1 = await fetchSessionData(session1);
      const fullSession2 = await fetchSessionData(session2);

      setComparisonSessions([fullSession1, fullSession2]);
      setComparisonOpen(true);
    } catch (error) {
      console.error("Error fetching session data for comparison:", error);
    }
  };

  const handleSyncNow = async () => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      const { data: tokens } = await supabase
        .from("wearable_tokens")
        .select("scope")
        .eq("user_id", userId);

      const scopes = tokens?.map(t => t.scope) ?? [];
      if (scopes.length === 0) {
        toast({ title: "No device connected", description: "Connect a wearable device in Settings first." });
        return;
      }

      const invocations = scopes.flatMap((scope: string) => {
        if (scope === "oura") return [supabase.functions.invoke("fetch-oura-data", { body: { user_id: userId } })];
        if (scope === "garmin") return [supabase.functions.invoke("fetch-garmin-data", { body: { user_id: userId } })];
        return [];
      });

      const results = await Promise.allSettled(invocations);
      const failed = results.filter(r => r.status === "rejected").length;

      if (failed === results.length) {
        toast({ title: "Sync failed", description: "We couldn't sync your data. Try reconnecting in Settings.", variant: "destructive" });
      } else if (failed > 0) {
        toast({ title: "Partially synced", description: "Some data updated. Check Settings if a device is missing." });
      } else {
        toast({ title: "Sync complete", description: "Your training data is up to date." });
      }
      await Promise.all([refresh(), refetchWearable()]);
    } catch {
      toast({ title: "Sync failed", description: "We couldn't sync your data. Please try again.", variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([
        refresh(),
        refetchWearable()
      ]);
      toast({
        title: "Refreshed",
        description: "Training data has been updated",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to refresh training data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const trainingContent = (
    <TooltipProvider>
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-7xl">
          {/* Header */}
          <LayoutBlock
            blockId="header"
            displayName="Header"
            pageId="training"
            size="wide"
            visible={isSectionVisible('header')}
          >
            <div className="text-center mb-6 md:mb-8">
              <div className="flex justify-end mb-2">
                <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Training Analytics</h1>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                {userId ? "Track your workouts and training progression" : "Please connect a device to see your data"}
              </p>
              {userId && (
                <div className="flex justify-center">
                  <OuraSyncStatus onSync={handleSyncNow} isSyncing={isSyncing} />
                </div>
              )}
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

          {!userId && (
            <div className="text-center py-12 px-4 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl mb-8">
              <p className="text-muted-foreground mb-4">No user authenticated</p>
              <p className="text-sm text-muted-foreground">Please log in to view your training data</p>
            </div>
          )}

          {showGarminPending && (
            <div className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm animate-fade-in">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                <strong>Your wearable is connected</strong> but no workout data has synced yet. Data will arrive automatically when your device syncs.
              </span>
            </div>
          )}

          {userId && (

            <>
              {/* Accountability Challenges */}
              <LayoutBlock
                blockId="accountabilityChallenges"
                displayName="Accountability Challenges"
                pageId="training"
                size="wide"
                visible={isSectionVisible('accountabilityChallenges')}
                className="mb-6 md:mb-8"
              >
                <AccountabilityChallenges />
              </LayoutBlock>

              {/* Training Calendar */}
              <LayoutBlock
                blockId="trainingCalendar"
                displayName="Training Calendar"
                pageId="training"
                size="wide"
                visible={isSectionVisible('trainingCalendar')}
                className="mb-6 md:mb-8"
              >
                <TrainingCalendar />
              </LayoutBlock>

              {/* Session Logs and Gauges */}
              <LayoutBlock
                blockId="sessionLogs"
                displayName="Session Logs"
                pageId="training"
                size="wide"
                visible={isSectionVisible('sessionLogs')}
                className="mb-6 md:mb-8"
              >
              <div className="w-full">
                  <SessionLogList onCompareRequested={handleCompareRequested} />
                </div>
                <LayoutBlock
                  blockId="gauges"
                  displayName="Training Gauges"
                  pageId="training"
                  size="wide"
                  visible={isSectionVisible('gauges')}
                  className="mt-4 md:mt-6"
                >
                  {/* Device Source Switcher for gauges */}
                  <DeviceSourceSwitcher
                    availableSources={availableSources}
                    selectedSource={selectedSource}
                    onSourceChange={setSelectedSource}
                    className="mb-4"
                  />
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <CircularGauge
                      title="Monotony"
                      value={latestAvailableTrend?.monotony ? parseFloat(latestAvailableTrend.monotony.toFixed(1)) : 0}
                      maxValue={5}
                      unit="ratio"
                    />
                    <CircularGauge
                      title="Strain"
                      value={latestAvailableTrend?.strain ? Math.round(latestAvailableTrend.strain) : 0}
                      maxValue={200}
                      unit="TSS"
                    />
                    <CircularGauge
                      title="Fatigue Index"
                      value={fatigueIndex}
                      maxValue={100}
                      unit="%"
                    />
                    <CircularGauge
                      title="Total Calories"
                      value={wearableData?.total_calories ? Math.round(wearableData.total_calories) : 0}
                      maxValue={4000}
                      unit="kcal"
                    />
                    <CircularGauge
                      title="Readiness"
                      value={wearableData?.readiness_score ?? 0}
                      maxValue={100}
                      unit="%"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <CircularGauge
                        title="Running Distance"
                        value={runningDistanceLoading ? 0 : parseFloat(runningDistance.toFixed(1))}
                        maxValue={50}
                        unit="km"
                      />
                      {runningDistanceIsEstimated && !runningDistanceLoading && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-[10px] text-muted-foreground text-center cursor-help underline decoration-dotted max-w-[100px] leading-tight">
                                Estimated from steps
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-[200px] text-center text-xs">
                              GPS distance will show once your wearable syncs
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </LayoutBlock>
              </LayoutBlock>

              {/* Trend Analysis Carousel */}
              <LayoutBlock
                blockId="trendAnalysis"
                displayName="Trend Analysis"
                pageId="training"
                size="wide"
                visible={isSectionVisible('trendAnalysis')}
                className="mb-6 md:mb-8"
              >
                <UnifiedTrendCard />
              </LayoutBlock>
            </>
          )}
        </div>

      {/* Session Comparison Modal */}
      <SessionComparison
        open={comparisonOpen}
        onOpenChange={setComparisonOpen}
        session1={comparisonSessions[0] || null}
        session2={comparisonSessions[1] || null}
      />
    </TooltipProvider>
  );

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>
          {trainingContent}
        </PullToRefresh>
      ) : (
        trainingContent
      )}
    </div>
  );
};
