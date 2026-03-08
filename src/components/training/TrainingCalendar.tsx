import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon, ChevronLeft, ChevronRight,
  Clock, Flame, Heart, Activity, Route, Zap,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DaySession {
  id: string;
  date: string;
  session_type: string | null;
  duration_minutes: number | null;
  total_distance_km: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  training_load: number | null;
  active_calories: number | null;
  spo2_avg: number | null;
  vo2_max: number | null;
  training_status: string | null;
  body_battery_end: number | null;
  stress_avg: number | null;
  intensity_minutes_moderate: number | null;
  intensity_minutes_vigorous: number | null;
  source: string;
}

// ─── Activity emoji + colour mapping ─────────────────────────────────────────

const ACTIVITY_EMOJI: [RegExp, string][] = [
  [/run|jog|sprint/i,                "🏃"],
  [/cycl|bike|bik|ride|velo/i,       "🚴"],
  [/swim|pool|open_water/i,          "🏊"],
  [/strength|lift|weight|gym|hiit|cross/i, "💪"],
  [/yoga|pilates|mobility|stretch|flex/i,  "🧘"],
  [/walk|hike|trek/i,                "🚶"],
  [/ski|snowboard/i,                 "⛷️"],
  [/row/i,                           "🚣"],
];

function activityEmoji(sessionType: string | null): string {
  if (!sessionType) return "📊";
  for (const [re, emoji] of ACTIVITY_EMOJI) {
    if (re.test(sessionType)) return emoji;
  }
  return "📊";
}

function loadColour(load: number | null): string {
  if (!load) return "bg-slate-400/40";
  if (load >= 8) return "bg-red-500";
  if (load >= 5) return "bg-orange-400";
  if (load >= 3) return "bg-yellow-400";
  return "bg-emerald-400";
}

function trainingStatusLabel(status: string | null): string {
  if (!status) return "";
  const map: Record<string, string> = {
    PEAKING: "Peaking",
    MAINTAINING: "Maintaining",
    OVERREACHING: "Overreaching",
    RECOVERING: "Recovering",
    UNPRODUCTIVE: "Unproductive",
    DETRAINING: "Detraining",
    NO_STATUS: "",
  };
  return map[status] ?? status.replace(/_/g, " ").toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TrainingCalendar = () => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [sessions, setSessions] = useState<DaySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<DaySession | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // ── Data fetch ─────────────────────────────────────────────────────────────

  const fetchSessions = useCallback(async (date: Date, mode: "month" | "week") => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let start: Date, end: Date;
      if (mode === "month") {
        start = startOfMonth(date);
        end = endOfMonth(date);
      } else {
        start = startOfWeek(date, { weekStartsOn: 1 });
        end = endOfWeek(date, { weekStartsOn: 1 });
      }

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select(`id, date, session_type, duration_minutes, total_distance_km,
                 avg_heart_rate, max_heart_rate, training_load, active_calories,
                 spo2_avg, vo2_max, training_status, body_battery_end, stress_avg,
                 intensity_minutes_moderate, intensity_minutes_vigorous, source`)
        .eq("user_id", user.id)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"))
        .order("date", { ascending: true });

      if (error) throw error;
      setSessions((data as unknown as DaySession[]) || []);
    } catch (err) {
      console.error("TrainingCalendar fetch error:", err);
      toast({ title: "Error", description: "Failed to load sessions", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSessions(currentDate, viewMode);
  }, [currentDate, viewMode, fetchSessions]);

  // ── Calendar grid helpers ──────────────────────────────────────────────────

  const sessionsByDate = new Map<string, DaySession>();
  for (const s of sessions) {
    sessionsByDate.set(s.date, s);
  }

  const getCalendarDays = (): Date[] => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    // Month view: fill full 6-week grid
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  };

  const calendarDays = getCalendarDays();

  const handleDayClick = (day: Date) => {
    const key = format(day, "yyyy-MM-dd");
    const session = sessionsByDate.get(key);
    if (session) {
      setSelectedSession(session);
      setSheetOpen(true);
    }
  };

  const navigate = (dir: -1 | 1) => {
    if (viewMode === "month") {
      setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(prev => addDays(prev, dir * 7));
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const weekHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <>
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-glass overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center">
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Training Calendar</h3>
              <p className="text-xs text-muted-foreground">Tap a day to see session details</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant={viewMode === "month" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs" onClick={() => setViewMode("month")}>Month</Button>
            <Button size="sm" variant={viewMode === "week" ? "default" : "outline"}
              className="h-7 px-2.5 text-xs" onClick={() => setViewMode("week")}>Week</Button>
          </div>
        </div>

        {/* Month / week nav */}
        <div className="flex items-center justify-between px-4 py-2">
          <button onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-foreground">
            {viewMode === "month"
              ? format(currentDate, "MMMM yyyy")
              : `${format(calendarDays[0], "d MMM")} – ${format(calendarDays[6], "d MMM yyyy")}`}
          </span>
          <button onClick={() => navigate(1)}
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="px-2 pb-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {weekHeaders.map(h => (
              <div key={h} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                {h}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-sm text-muted-foreground animate-pulse">
              Loading calendar…
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-0.5">
              {calendarDays.map((day, i) => {
                const key = format(day, "yyyy-MM-dd");
                const session = sessionsByDate.get(key);
                const inMonth = isSameMonth(day, currentDate);
                const today = isToday(day);
                const hasSession = !!session;
                const emoji = hasSession ? activityEmoji(session!.session_type) : null;
                const dotColour = hasSession ? loadColour(session!.training_load) : "";

                return (
                  <button
                    key={i}
                    onClick={() => handleDayClick(day)}
                    disabled={!hasSession}
                    className={cn(
                      "relative flex flex-col items-center justify-start pt-1 pb-1.5 rounded-xl min-h-[52px] sm:min-h-[60px] transition-all",
                      hasSession
                        ? "cursor-pointer hover:bg-primary/10 active:scale-95"
                        : "cursor-default",
                      today && "ring-1 ring-primary/60",
                      !inMonth && "opacity-30",
                    )}
                  >
                    {/* Day number */}
                    <span className={cn(
                      "text-[11px] sm:text-xs font-medium leading-tight",
                      today ? "text-primary font-bold" : "text-foreground/70",
                    )}>
                      {format(day, "d")}
                    </span>

                    {/* Activity emoji */}
                    {emoji && (
                      <span className="text-base sm:text-lg leading-none mt-0.5">{emoji}</span>
                    )}

                    {/* Load dot */}
                    {hasSession && (
                      <div className={cn("w-1.5 h-1.5 rounded-full mt-0.5", dotColour)} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border/20 flex-wrap">
          {[
            { colour: "bg-emerald-400", label: "Light" },
            { colour: "bg-yellow-400", label: "Moderate" },
            { colour: "bg-orange-400", label: "High" },
            { colour: "bg-red-500", label: "Very High" },
          ].map(({ colour, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", colour)} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
          <span className="text-[10px] text-muted-foreground ml-auto">Load intensity</span>
        </div>
      </div>

      {/* ── Session detail sheet ─────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto pb-safe">
          {selectedSession && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-3">
                  <span className="text-3xl">{activityEmoji(selectedSession.session_type)}</span>
                  <div>
                    <p className="text-base font-bold text-foreground">
                      {selectedSession.session_type
                        ? selectedSession.session_type.replace(/_/g, " ").replace(/^\w/, c => c.toUpperCase())
                        : "Training Session"}
                    </p>
                    <p className="text-sm text-muted-foreground font-normal">
                      {format(new Date(selectedSession.date + "T00:00:00"), "EEEE, d MMMM yyyy")}
                    </p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedSession.training_status && (
                  <Badge variant="outline" className="text-xs">
                    {trainingStatusLabel(selectedSession.training_status)}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs capitalize">
                  {selectedSession.source}
                </Badge>
              </div>

              {/* Metric grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedSession.duration_minutes && (
                  <MetricCell icon={<Clock className="h-4 w-4 text-blue-400" />}
                    label="Duration" value={`${selectedSession.duration_minutes} min`} />
                )}
                {selectedSession.total_distance_km && (
                  <MetricCell icon={<Route className="h-4 w-4 text-green-400" />}
                    label="Distance" value={`${selectedSession.total_distance_km.toFixed(2)} km`} />
                )}
                {selectedSession.avg_heart_rate && (
                  <MetricCell icon={<Heart className="h-4 w-4 text-red-400" />}
                    label="Avg HR" value={`${Math.round(selectedSession.avg_heart_rate)} bpm`} />
                )}
                {selectedSession.max_heart_rate && (
                  <MetricCell icon={<Heart className="h-4 w-4 text-red-600" />}
                    label="Max HR" value={`${Math.round(selectedSession.max_heart_rate)} bpm`} />
                )}
                {selectedSession.training_load && (
                  <MetricCell icon={<Zap className="h-4 w-4 text-yellow-400" />}
                    label="Training Load" value={selectedSession.training_load.toFixed(1)} />
                )}
                {selectedSession.active_calories && (
                  <MetricCell icon={<Flame className="h-4 w-4 text-orange-400" />}
                    label="Active Cal" value={`${Math.round(selectedSession.active_calories)} kcal`} />
                )}
                {selectedSession.spo2_avg && (
                  <MetricCell icon={<Activity className="h-4 w-4 text-cyan-400" />}
                    label="SpO₂" value={`${selectedSession.spo2_avg.toFixed(1)}%`} />
                )}
                {selectedSession.vo2_max && (
                  <MetricCell icon={<Activity className="h-4 w-4 text-purple-400" />}
                    label="VO₂ Max" value={`${selectedSession.vo2_max.toFixed(1)} mL/kg/min`} />
                )}
                {selectedSession.body_battery_end !== null && selectedSession.body_battery_end !== undefined && (
                  <MetricCell icon={<Zap className="h-4 w-4 text-green-300" />}
                    label="Body Battery" value={`${selectedSession.body_battery_end}%`} />
                )}
                {selectedSession.stress_avg && (
                  <MetricCell icon={<Activity className="h-4 w-4 text-rose-400" />}
                    label="Avg Stress" value={`${Math.round(selectedSession.stress_avg)}`} />
                )}
                {(selectedSession.intensity_minutes_moderate || selectedSession.intensity_minutes_vigorous) && (
                  <MetricCell icon={<Clock className="h-4 w-4 text-teal-400" />}
                    label="Intensity Min"
                    value={`${selectedSession.intensity_minutes_moderate ?? 0}m / ${selectedSession.intensity_minutes_vigorous ?? 0}v`} />
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

// ── Small metric cell ──────────────────────────────────────────────────────────

const MetricCell = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <p className="text-sm font-semibold text-foreground">{value}</p>
  </div>
);
