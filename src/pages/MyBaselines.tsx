import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Heart, Activity, Moon, Dumbbell, RefreshCw, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useLayoutCustomization } from "@/hooks/useLayoutCustomization";
import { CustomizeLayoutButton } from "@/components/layout/CustomizeLayoutButton";
import { LayoutEditor } from "@/components/layout/LayoutEditor";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { format, subDays } from "date-fns";
import {
  LineChart, Line, ResponsiveContainer, Tooltip as RTooltip,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionRow {
  date: string;
  resting_hr: number | null;
  hrv_avg: number | null;
  sleep_score: number | null;
  training_load: number | null;
  readiness_score: number | null;
}

interface BaselineRow {
  metric: string;
  rolling_avg: number;
  data_window: number;
}

type Status = "normal" | "below" | "above" | "no_data";

interface MetricDef {
  key: keyof Omit<SessionRow, "date">;
  dbMetric: string;          // name stored in user_baselines
  label: string;
  description: string;
  unit: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;             // tailwind text colour for sparkline
  hexColor: string;          // recharts stroke hex
  /** For HR: lower = better. For others: higher = better (or neutral). */
  lowerIsBetter?: boolean;
}

const METRICS: MetricDef[] = [
  {
    key: "resting_hr",
    dbMetric: "resting_hr",
    label: "Resting Heart Rate",
    description: "Your baseline resting HR from the last 28 days. Lower is generally better for cardiovascular fitness.",
    unit: "bpm",
    icon: Heart,
    color: "text-red-400",
    hexColor: "#f87171",
    lowerIsBetter: true,
  },
  {
    key: "hrv_avg",
    dbMetric: "hrv",
    label: "HRV",
    description: "Heart rate variability baseline. Higher HRV typically signals better recovery and resilience.",
    unit: "ms",
    icon: Activity,
    color: "text-blue-400",
    hexColor: "#60a5fa",
  },
  {
    key: "sleep_score",
    dbMetric: "sleep_score",
    label: "Sleep Score",
    description: "Average sleep quality score from your wearable. Above 70 is good; above 85 is excellent.",
    unit: "/ 100",
    icon: Moon,
    color: "text-purple-400",
    hexColor: "#a78bfa",
  },
  {
    key: "training_load",
    dbMetric: "training_load",
    label: "Training Load",
    description: "7-day average accumulated training load. Your personal normal range guides overreaching detection.",
    unit: "AU",
    icon: Dumbbell,
    color: "text-emerald-400",
    hexColor: "#34d399",
  },
  {
    key: "readiness_score",
    dbMetric: "readiness_score",
    label: "Recovery Score",
    description: "Readiness / recovery score from your wearable. Reflects how ready your body is for the day.",
    unit: "/ 100",
    icon: TrendingUp,
    color: "text-orange-400",
    hexColor: "#fb923c",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function avg(vals: (number | null)[]): number | null {
  const valid = vals.filter((v) => v != null) as number[];
  if (!valid.length) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function getStatus(
  today: number | null,
  baseline: number | null,
  lowerIsBetter = false,
): Status {
  if (today == null || baseline == null) return "no_data";
  const pct = ((today - baseline) / baseline) * 100;
  const threshold = 12; // ±12% = normal
  if (Math.abs(pct) <= threshold) return "normal";
  if (lowerIsBetter) {
    // HR: if today > baseline → "above" = bad → "below baseline" for performance
    return pct > 0 ? "below" : "above";
  }
  return pct > 0 ? "above" : "below";
}

function statusBadge(status: Status) {
  switch (status) {
    case "normal": return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Normal</Badge>;
    case "above":  return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Above baseline</Badge>;
    case "below":  return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Below baseline</Badge>;
    default:       return <Badge className="bg-muted/30 text-muted-foreground text-xs">No data</Badge>;
  }
}

function fmt(v: number | null, decimals = 0): string {
  if (v == null) return "—";
  return Number(v).toFixed(decimals);
}

// ── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({ data, dataKey, color }: { data: SessionRow[]; dataKey: keyof SessionRow; color: string }) {
  const points = data.map((r) => ({ v: r[dataKey] as number | null }));
  if (points.every((p) => p.v == null)) {
    return <div className="h-[48px] flex items-center justify-center text-xs text-muted-foreground">No data</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={48}>
      <LineChart data={points}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          connectNulls={false}
        />
        <RTooltip
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <div className="bg-card/90 border border-border text-xs rounded px-2 py-1">
                {payload[0].value != null ? Number(payload[0].value).toFixed(1) : "—"}
              </div>
            ) : null
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Baseline Card ──────────────────────────────────────────────────────────

interface CardProps {
  def: MetricDef;
  baseline: number | null;
  todayVal: number | null;
  sparkData: SessionRow[];
  minVal: number | null;
  maxVal: number | null;
}

function BaselineCard({ def, baseline, todayVal, sparkData, minVal, maxVal }: CardProps) {
  const { icon: Icon, label, description, unit, hexColor, lowerIsBetter } = def;
  const status = getStatus(todayVal, baseline, lowerIsBetter);

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-5 shadow-glass hover:bg-glass-highlight transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className={`h-4 w-4 ${def.color}`} />
          </div>
          <span className="text-sm font-semibold text-foreground">{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {statusBadge(status)}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">{description}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Baseline + today */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Your baseline</p>
          <p className="text-xl font-bold text-foreground">
            {fmt(baseline, baseline != null && baseline < 10 ? 1 : 0)}
            <span className="text-xs text-muted-foreground ml-1">{unit}</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Today</p>
          <p className="text-xl font-bold text-foreground">
            {fmt(todayVal, todayVal != null && todayVal < 10 ? 1 : 0)}
            <span className="text-xs text-muted-foreground ml-1">{todayVal != null ? unit : ""}</span>
          </p>
        </div>
      </div>

      {/* 28-day range */}
      {(minVal != null || maxVal != null) && (
        <p className="text-xs text-muted-foreground mb-3">
          28-day range: {fmt(minVal, 0)} – {fmt(maxVal, 0)} {unit}
        </p>
      )}

      {/* Sparkline */}
      <Sparkline data={sparkData} dataKey={def.key} color={hexColor} />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function MyBaselines() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [baselines, setBaselines] = useState<BaselineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [distinctDays, setDistinctDays] = useState(0);

  const {
    isEditing: isLayoutEditing, editingSections, isCustomized: layoutCustomized,
    previewMode, openEditor: openLayoutEditor, closeEditor: closeLayoutEditor,
    saveLayout, resetToDefault, toggleSectionVisibility, toggleCollapseByDefault,
    togglePreviewMode, moveSectionUp, moveSectionDown, reorderSections, isSectionVisible,
  } = useLayoutCustomization("baselines");

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const since = format(subDays(new Date(), 27), "yyyy-MM-dd");

      const [sessRes, baseRes] = await Promise.all([
        supabase
          .from("wearable_sessions")
          .select("date, resting_hr, hrv_avg, sleep_score, training_load, readiness_score")
          .eq("user_id", user.id)
          .gte("date", since)
          .order("date", { ascending: true }),
        supabase
          .from("user_baselines")
          .select("metric, rolling_avg, data_window")
          .eq("user_id", user.id),
      ]);

      const rows = (sessRes.data ?? []) as SessionRow[];
      setSessions(rows);
      setBaselines((baseRes.data ?? []) as BaselineRow[]);

      // Count distinct dates (dedupe by date)
      const uniqueDates = new Set(rows.map((r) => r.date));
      setDistinctDays(uniqueDates.size);
    } catch (err) {
      console.error("Baselines fetch error:", err);
      toast({ title: "Error loading baselines", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Recalculate ───────────────────────────────────────────────────────────

  const handleRecalculate = async () => {
    if (!userId) return;
    setRecalculating(true);
    try {
      const upserts = METRICS.map((m) => {
        const vals = sessions.map((s) => s[m.key] as number | null);
        const rollingAvg = avg(vals);
        if (rollingAvg == null) return null;
        return {
          user_id: userId,
          metric: m.dbMetric,
          rolling_avg: Math.round(rollingAvg * 100) / 100,
          data_window: sessions.length,
          updated_at: new Date().toISOString(),
        };
      }).filter(Boolean) as object[];

      if (upserts.length === 0) {
        toast({ title: "Not enough data", description: "No wearable data found to calculate baselines.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("user_baselines")
        .upsert(upserts as any, { onConflict: "user_id,metric" });

      if (error) throw error;

      toast({ title: "Baselines updated", description: "Your personal baselines have been recalculated from the last 28 days." });
      await fetchData();
    } catch (err) {
      console.error("Recalculate error:", err);
      toast({ title: "Recalculation failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setRecalculating(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  // Baseline map: dbMetric → rolling_avg
  const baselineMap = new Map(baselines.map((b) => [b.metric, b.rolling_avg]));

  // Today's values: most recent session row
  const today = sessions.length > 0 ? sessions[sessions.length - 1] : null;

  // Per-metric: range (min/max over 28 days)
  function rangeFor(key: keyof Omit<SessionRow, "date">): { min: number | null; max: number | null } {
    const vals = sessions.map((s) => s[key] as number | null).filter((v) => v != null) as number[];
    if (!vals.length) return { min: null, max: null };
    return { min: Math.min(...vals), max: Math.max(...vals) };
  }

  // Derived baseline (from DB or calculated from sessions)
  function baselineFor(m: MetricDef): number | null {
    if (baselineMap.has(m.dbMetric)) return baselineMap.get(m.dbMetric)!;
    return avg(sessions.map((s) => s[m.key] as number | null));
  }

  const hasEnoughData = distinctDays >= 7;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6 pb-32 md:pb-24">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <LayoutBlock blockId="header" displayName="Header" pageId="baselines" size="wide" visible={isSectionVisible("header")}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Your Baselines</h1>
                <p className="text-sm text-muted-foreground">Personal normal ranges calculated from your data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                disabled={recalculating || loading || sessions.length === 0}
                className="gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? "animate-spin" : ""}`} />
                {recalculating ? "Recalculating…" : "Recalculate"}
              </Button>
              <CustomizeLayoutButton onClick={openLayoutEditor} isCustomized={layoutCustomized} />
            </div>
          </div>
        </LayoutBlock>

        {/* Layout Editor */}
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

        {/* Not-enough-data banner */}
        {!loading && !hasEnoughData && (
          <Alert className="mb-6 border-amber-500/40 bg-amber-500/10">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <AlertDescription className="text-sm text-amber-200">
              <strong>Your baselines are still being calculated.</strong>{" "}
              Check back after {Math.max(0, 7 - distinctDays)} more day
              {7 - distinctDays !== 1 ? "s" : ""} of wearable data
              {distinctDays > 0 ? ` (${distinctDays}/7 so far)` : ""}.
            </AlertDescription>
          </Alert>
        )}

        {/* Baseline cards */}
        <LayoutBlock blockId="baselineCards" displayName="Baseline Cards" pageId="baselines" size="wide" visible={isSectionVisible("baselineCards")} className="mb-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {METRICS.map((m) => (
                <Skeleton key={m.key} className="h-[220px] rounded-2xl" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-primary/60" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">No data yet</h2>
              <p className="text-muted-foreground max-w-sm text-sm">
                Connect a wearable and sync some data to start building your personal baselines.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {METRICS.map((m) => {
                const { min, max } = rangeFor(m.key);
                return (
                  <BaselineCard
                    key={m.key}
                    def={m}
                    baseline={baselineFor(m)}
                    todayVal={today ? (today[m.key] as number | null) : null}
                    sparkData={sessions}
                    minVal={min}
                    maxVal={max}
                  />
                );
              })}
            </div>
          )}
        </LayoutBlock>

        {/* Footer note */}
        {!loading && sessions.length > 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Baselines calculated from up to 28 days of wearable data · Last {distinctDays} day{distinctDays !== 1 ? "s" : ""} of data available
          </p>
        )}
      </div>
    </div>
  );
}
