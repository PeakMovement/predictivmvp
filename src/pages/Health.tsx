import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceSourceSwitcher } from "@/components/DeviceSourceSwitcher";
import { HealthMiniTrendChart } from "@/components/health/HealthMiniTrendChart";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  Moon, Clock, Zap, Heart, Activity, Droplets,
  Settings, Info as InfoIcon, TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNowStrict } from "date-fns";
import { format, subDays } from "date-fns";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function scoreColor(value: number): string {
  if (value >= 85) return "text-emerald-400";
  if (value >= 70) return "text-yellow-400";
  return "text-red-400";
}

function scoreStroke(value: number): string {
  if (value >= 85) return "stroke-emerald-400";
  if (value >= 70) return "stroke-yellow-400";
  return "stroke-red-400";
}

// ── ScoreRing ──────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = size * 0.42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;
  const c = size / 2;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={c} cy={c} r={r} stroke="hsl(var(--muted))" strokeWidth="8" fill="none" className="opacity-20" />
      <circle
        cx={c} cy={c} r={r}
        stroke="currentColor"
        strokeWidth="8"
        fill="none"
        className={scoreStroke(score)}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

// ── Trend data type ────────────────────────────────────────────────────────

interface TrendRow {
  date: string;
  sleep_score: number | null;
  total_sleep_duration: number | null;
  hrv_avg: number | null;
  resting_hr: number | null;
  [key: string]: number | null | string;
}

// ── Main Component ─────────────────────────────────────────────────────────

export const Health = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>("auto");
  const [hasAnyToken, setHasAnyToken] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [trendData, setTrendData] = useState<TrendRow[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);

  const {
    isEditing: isLayoutEditing, editingSections, isCustomized: layoutCustomized,
    previewMode, openEditor: openLayoutEditor, closeEditor: closeLayoutEditor,
    saveLayout, resetToDefault, toggleSectionVisibility, toggleCollapseByDefault,
    togglePreviewMode, moveSectionUp, moveSectionDown, reorderSections, isSectionVisible,
  } = useLayoutCustomization("health");

  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { data: session, isLoading, refetch } = useWearableSessions(userId || undefined, selectedSource);

  // ── Auth & source detection ──────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id || null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase.from("wearable_tokens").select("scope").eq("user_id", userId)
      .then(({ data }) => setHasAnyToken(!!data && data.length > 0));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    supabase.from("wearable_sessions").select("source").eq("user_id", userId)
      .then(({ data }) => {
        if (!data) return;
        const known = ["oura", "garmin", "polar"];
        const unique = [...new Set(data.map((r) => r.source))].filter((s) => known.includes(s)).sort();
        setAvailableSources(unique);
        if (unique.length > 0 && selectedSource === "auto") {
          // keep "auto" — useWearableSessions handles it
        } else if (unique.length > 0 && !unique.includes(selectedSource)) {
          setSelectedSource(unique[0]);
        }
      });
  }, [userId]);

  // ── 7-day trend fetch ────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setTrendLoading(true);
      const start = format(subDays(new Date(), 6), "yyyy-MM-dd");
      let q = supabase
        .from("wearable_sessions")
        .select("date, sleep_score, total_sleep_duration, hrv_avg, resting_hr")
        .eq("user_id", userId)
        .gte("date", start)
        .order("date", { ascending: true });
      if (selectedSource !== "auto") q = q.eq("source", selectedSource);
      const { data } = await q;
      setTrendData((data as TrendRow[]) || []);
      setTrendLoading(false);
    };
    load();
  }, [userId, selectedSource]);

  // ── Sync handler ─────────────────────────────────────────────────────────

  const handleSyncNow = async () => {
    if (!userId) return;
    setIsSyncing(true);
    try {
      const { data: tokens } = await supabase.from("wearable_tokens").select("scope").eq("user_id", userId);
      const scopes = tokens?.map((t) => t.scope) ?? [];
      if (!scopes.length) { toast({ title: "No device connected", description: "Connect a wearable in Settings first." }); return; }
      const calls = scopes.flatMap((scope) => {
        if (scope === "oura") return [supabase.functions.invoke("fetch-oura-data", { body: { user_id: userId } })];
        if (scope === "garmin") return [supabase.functions.invoke("fetch-garmin-data", { body: { user_id: userId } })];
        return [];
      });
      const results = await Promise.allSettled(calls);
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === results.length) toast({ title: "Sync failed", description: "Couldn't sync data. Try reconnecting in Settings.", variant: "destructive" });
      else if (failed > 0) toast({ title: "Partially synced", description: "Some data updated." });
      else toast({ title: "Sync complete", description: "Your health data is up to date." });
      await refetch();
    } catch { toast({ title: "Sync failed", variant: "destructive" }); }
    finally { setIsSyncing(false); }
  };

  const handleRefresh = async () => {
    try { await refetch(); }
    catch { toast({ title: "Refresh failed", variant: "destructive" }); }
  };

  // ── Derived sleep data ───────────────────────────────────────────────────

  const sleepScore = session?.sleep_score ?? null;
  // total_sleep_duration is already in minutes
  const totalSleepMin = session?.total_sleep_duration ?? null;
  const deepMin   = session?.deep_sleep_duration ?? null;
  const remMin    = session?.rem_sleep_duration ?? null;
  const lightMin  = session?.light_sleep_duration ?? null;
  const efficiency = session?.sleep_efficiency ?? null;
  const totalStageMin = (deepMin ?? 0) + (remMin ?? 0) + (lightMin ?? 0);
  const hasStages = totalStageMin > 0;

  const stagePercent = (v: number | null) =>
    totalStageMin > 0 ? Math.round(((v ?? 0) / totalStageMin) * 100) : 0;

  const lastSyncDate = session?.fetched_at ? new Date(session.fetched_at) : null;
  const isStale = lastSyncDate ? (Date.now() - lastSyncDate.getTime()) / 3_600_000 > 24 : false;

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (userId === null || (userId && isLoading)) {
    return (
      <div className="min-h-screen bg-background pb-nav-safe">
        <div className="container mx-auto px-4 md:px-6 pt-6 max-w-4xl space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────

  const emptyState = !isLoading && !session;

  // ── Page content ─────────────────────────────────────────────────────────

  const healthContent = (
    <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-4xl overflow-x-hidden">
      {/* Header */}
      <LayoutBlock blockId="header" displayName="Header" pageId="health" size="wide" visible={isSectionVisible("header")}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Health</h1>
            <p className="text-sm text-muted-foreground mt-1">Sleep, heart rate &amp; recovery</p>
          </div>
          <div className="flex items-center gap-2">
            <OuraSyncStatus onSync={handleSyncNow} isSyncing={isSyncing} />
            <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
          </div>
        </div>
      </LayoutBlock>

      {isLayoutEditing && (
        <div className="mb-6 animate-fade-in">
          <LayoutEditor
            sections={editingSections} previewMode={previewMode}
            onSave={saveLayout} onCancel={closeLayoutEditor} onReset={resetToDefault}
            onToggleVisibility={toggleSectionVisibility} onToggleCollapseByDefault={toggleCollapseByDefault}
            onTogglePreviewMode={togglePreviewMode} onMoveUp={moveSectionUp} onMoveDown={moveSectionDown}
            onReorder={reorderSections}
          />
        </div>
      )}

      {/* Source switcher */}
      {availableSources.length > 1 && (
        <div className="mb-6">
          <DeviceSourceSwitcher
            availableSources={availableSources}
            selectedSource={selectedSource}
            onSourceChange={setSelectedSource}
          />
        </div>
      )}

      {/* Empty state — no device connected */}
      {emptyState && hasAnyToken === false && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <Heart className="w-8 h-8 text-primary/60" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">No health data yet</h2>
          <p className="text-muted-foreground max-w-sm mb-6">
            Connect a wearable in Settings to start tracking your sleep and heart rate.
          </p>
          <Button onClick={() => navigate("/settings")} className="gap-2">
            <Settings className="h-4 w-4" />
            Go to Settings
          </Button>
        </div>
      )}

      {/* Empty state — device connected but no data yet */}
      {emptyState && hasAnyToken === true && (
        <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
          <InfoIcon className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-500">No data synced yet</AlertTitle>
          <AlertDescription className="text-sm text-muted-foreground">
            Your device is connected. Wear it overnight and tap "Sync Now" after 8 AM.
          </AlertDescription>
        </Alert>
      )}

      {session && (
        <>
          {/* ── SLEEP SECTION ────────────────────────────────────────────── */}
          <LayoutBlock blockId="sleep" displayName="Sleep" pageId="health" size="wide" visible={isSectionVisible("sleep")} className="mb-6">
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Sleep</h2>
              </div>

              {/* Today's values */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                {/* Sleep score ring */}
                <div className="flex flex-col items-center justify-center gap-2">
                  {sleepScore != null ? (
                    <>
                      <div className="relative w-28 h-28 flex items-center justify-center">
                        <ScoreRing score={sleepScore} size={112} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-3xl font-bold ${scoreColor(sleepScore)}`}>{sleepScore}</span>
                          <span className="text-xs text-muted-foreground">/ 100</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">Sleep Score</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1 py-4">
                      <span className="text-3xl font-bold text-muted-foreground">—</span>
                      <p className="text-sm text-muted-foreground">Sleep Score</p>
                    </div>
                  )}
                </div>

                {/* Duration + efficiency */}
                <div className="space-y-3">
                  <div className="bg-background/50 border border-glass-border rounded-xl p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-400 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="text-lg font-semibold">{formatMinutes(totalSleepMin)}</p>
                    </div>
                  </div>
                  {efficiency != null && (
                    <div className="bg-background/50 border border-glass-border rounded-xl p-4 flex items-center gap-3">
                      <Zap className="w-5 h-5 text-yellow-400 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Efficiency</p>
                        <p className="text-lg font-semibold">{efficiency}%</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sleep stages */}
              {hasStages && (
                <div className="mb-6 pt-4 border-t border-glass-border">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Sleep Stages</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    {[
                      { label: "Deep", value: deepMin, color: "text-indigo-400" },
                      { label: "REM",  value: remMin,  color: "text-purple-400" },
                      { label: "Light", value: lightMin, color: "text-blue-300" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center bg-background/30 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-1">{label}</p>
                        <p className={`text-base font-bold ${color}`}>{formatMinutes(value)}</p>
                        <p className="text-xs text-muted-foreground">{stagePercent(value)}%</p>
                      </div>
                    ))}
                  </div>
                  {/* Stacked bar */}
                  <div className="w-full h-3 bg-background/50 rounded-full overflow-hidden flex">
                    {[
                      { value: deepMin, cls: "bg-indigo-500" },
                      { value: remMin,  cls: "bg-purple-500" },
                      { value: lightMin, cls: "bg-blue-400" },
                    ].map(({ value, cls }, i) => (
                      <div
                        key={i}
                        className={`${cls} h-full transition-all duration-500`}
                        style={{ width: `${stagePercent(value)}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 7-day sleep trend */}
              <div className="pt-4 border-t border-glass-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">7-Day Trend</p>
                {trendLoading ? (
                  <Skeleton className="h-[160px] w-full rounded-xl" />
                ) : (
                  <HealthMiniTrendChart
                    data={trendData}
                    metrics={[
                      { key: "sleep_score", label: "Sleep Score", color: "#8b5cf6" },
                    ]}
                  />
                )}
              </div>

              {/* Stale sync warning */}
              {lastSyncDate && (
                <div className={`mt-4 flex items-center justify-center gap-1.5 text-xs ${isStale ? "text-amber-500" : "text-muted-foreground"}`}>
                  {isStale && <AlertTriangle className="h-3 w-3" />}
                  <span>
                    {isStale
                      ? `Data may be out of date — synced ${formatDistanceToNowStrict(lastSyncDate)} ago`
                      : `Synced ${formatDistanceToNowStrict(lastSyncDate)} ago`}
                  </span>
                </div>
              )}
            </div>
          </LayoutBlock>

          {/* ── HEART RATE SECTION ───────────────────────────────────────── */}
          <LayoutBlock blockId="heartRate" displayName="Heart Rate" pageId="health" size="wide" visible={isSectionVisible("heartRate")} className="mb-6">
            <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass">
              {/* Section header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-foreground">Heart Rate</h2>
              </div>

              {/* Today's values */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <TooltipProvider>
                  {[
                    {
                      icon: <Heart className="w-6 h-6 text-red-400" />,
                      label: "Resting HR",
                      value: session.resting_hr != null ? `${session.resting_hr}` : "—",
                      unit: "bpm",
                      tip: "Your heart rate at complete rest. Lower values generally indicate better cardiovascular fitness.",
                    },
                    {
                      icon: <Activity className="w-6 h-6 text-blue-400" />,
                      label: "HRV",
                      value: session.hrv_avg != null ? `${Math.round(session.hrv_avg)}` : "—",
                      unit: "ms",
                      tip: "Heart rate variability — variation in time between beats. Higher HRV usually means better recovery.",
                    },
                    {
                      icon: <Droplets className="w-6 h-6 text-cyan-400" />,
                      label: "SpO₂",
                      value: session.spo2_avg != null ? session.spo2_avg.toFixed(1) : "—",
                      unit: "%",
                      tip: "Blood oxygen saturation. Normal is 95–100%.",
                    },
                  ].map(({ icon, label, value, unit, tip }) => (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <div className="bg-background/50 border border-glass-border rounded-xl p-5 text-center cursor-help hover:bg-background/70 transition-colors">
                          <div className="flex justify-center mb-2">{icon}</div>
                          <p className="text-2xl font-bold text-foreground">{value}</p>
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-xs text-muted-foreground">{unit}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">{tip}</TooltipContent>
                    </Tooltip>
                  ))}
                </TooltipProvider>
              </div>

              {/* 7-day HR trend */}
              <div className="pt-4 border-t border-glass-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">7-Day Trend</p>
                {trendLoading ? (
                  <Skeleton className="h-[160px] w-full rounded-xl" />
                ) : (
                  <HealthMiniTrendChart
                    data={trendData}
                    metrics={[
                      { key: "resting_hr", label: "Resting HR", color: "#ef4444", unit: "bpm" },
                      { key: "hrv_avg",    label: "HRV",        color: "#3b82f6", unit: "ms" },
                    ]}
                  />
                )}
              </div>
            </div>
          </LayoutBlock>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-nav-safe">
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh}>{healthContent}</PullToRefresh>
      ) : (
        healthContent
      )}
    </div>
  );
};
