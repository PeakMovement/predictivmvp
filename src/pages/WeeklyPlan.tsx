import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, Zap, Moon, Activity, Flame, ChevronDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { format, startOfWeek, addDays, isSameDay, parseISO, subDays } from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────

type SessionType = "Rest" | "Easy" | "Moderate" | "Hard";

interface DayPlan {
  date: Date;
  session: SessionType;
  advice: string;
  trainingLoad: number | null;
}

// ── Constants ──────────────────────────────────────────────────────────────

const SESSION_META: Record<SessionType, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  ring: string;
}> = {
  Rest: {
    icon: Moon,
    color: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    ring: "ring-slate-500/30",
  },
  Easy: {
    icon: Activity,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    ring: "ring-green-500/30",
  },
  Moderate: {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    ring: "ring-yellow-500/30",
  },
  Hard: {
    icon: Flame,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    ring: "ring-red-500/30",
  },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Plan generation ────────────────────────────────────────────────────────

/**
 * Determines session type from a training_load value (0–600+ scale typical).
 * Thresholds are intentionally conservative.
 */
function loadToSession(
  load: number | null,
  dayIndex: number,
  recentAvg: number | null
): SessionType {
  if (load === null) {
    // Fallback: 3-on / 1-off default (indices 0=Mon … 6=Sun)
    const defaultPattern: SessionType[] = ["Moderate", "Easy", "Hard", "Rest", "Moderate", "Easy", "Hard"];
    return defaultPattern[dayIndex % 7];
  }

  const avg = recentAvg ?? 300;

  if (load > avg * 1.3) return "Rest";
  if (load > avg * 1.1) return "Easy";
  if (load > avg * 0.85) return "Moderate";
  return "Hard";
}

/** Advice copy for each session type, varied by day of week. */
function sessionAdvice(session: SessionType, dayLabel: string, load: number | null): string {
  const loadNote = load !== null ? ` (load ${Math.round(load)})` : "";

  const advice: Record<SessionType, string[]> = {
    Rest: [
      `${dayLabel}${loadNote}: Your body is asking for recovery — prioritise sleep and light movement like walking or stretching.`,
      `${dayLabel}${loadNote}: High recent load signals fatigue. A full rest day now prevents a forced rest week later.`,
      `${dayLabel}${loadNote}: Rest is training. Use this day for mobility work and quality nutrition.`,
    ],
    Easy: [
      `${dayLabel}${loadNote}: Keep effort conversational — you should be able to hold a full sentence throughout.`,
      `${dayLabel}${loadNote}: Zone 2 today. Easy aerobic work builds your base without adding meaningful fatigue.`,
      `${dayLabel}${loadNote}: Light session to keep the body moving without deepening accumulated fatigue.`,
    ],
    Moderate: [
      `${dayLabel}${loadNote}: Good day for a structured session — tempo or threshold work is well within range.`,
      `${dayLabel}${loadNote}: Your recovery markers support a moderate effort today. Push to ~75–80% max HR.`,
      `${dayLabel}${loadNote}: Aim for a comfortably hard effort — challenging but sustainable for the full session.`,
    ],
    Hard: [
      `${dayLabel}${loadNote}: Metrics look solid — a quality high-intensity session will drive adaptation today.`,
      `${dayLabel}${loadNote}: Great recovery window for a hard effort. Intervals, hill reps, or a race-pace block work well.`,
      `${dayLabel}${loadNote}: Low recent load means your body is ready to absorb a harder stimulus. Give it a proper effort.`,
    ],
  };

  const options = advice[session];
  // Deterministic pick by day name
  const idx = DAY_LABELS.indexOf(dayLabel) % options.length;
  return options[idx < 0 ? 0 : idx];
}

function buildPlan(
  loads: (number | null)[],  // 7 values Mon–Sun (last 7 days)
  weekStart: Date,
  recentAvg: number | null
): DayPlan[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const session = loadToSession(loads[i] ?? null, i, recentAvg);
    const advice = sessionAdvice(session, DAY_LABELS[i], loads[i] ?? null);
    return { date, session, advice, trainingLoad: loads[i] ?? null };
  });
}

// ── Day Card ───────────────────────────────────────────────────────────────

function DayCard({
  plan,
  isToday,
  onClick,
}: {
  plan: DayPlan;
  isToday: boolean;
  onClick: () => void;
}) {
  const meta = SESSION_META[plan.session];
  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      className={[
        "flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all active:scale-95 touch-manipulation",
        meta.bg,
        meta.border,
        isToday ? `ring-2 ${meta.ring} shadow-md` : "opacity-90 hover:opacity-100",
      ].join(" ")}
    >
      <span className={`text-xs font-semibold ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
        {format(plan.date, "EEE")}
      </span>
      <span className={`text-[11px] ${isToday ? "text-foreground" : "text-muted-foreground"}`}>
        {format(plan.date, "d")}
      </span>
      <Icon className={`w-5 h-5 ${meta.color}`} />
      <span className={`text-[10px] font-semibold ${meta.color}`}>{plan.session}</span>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WeeklyPlan() {
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<DayPlan[]>([]);
  const [selected, setSelected] = useState<DayPlan | null>(null);

  const today = new Date();
  // Week starts on Monday
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const generatePlan = useCallback(async () => {
    if (!userId) return;
    setGenerating(true);

    // Fetch last 7 days of training_load from wearable_sessions
    const since = format(subDays(today, 7), "yyyy-MM-dd");
    const { data: sessions } = await supabase
      .from("wearable_sessions")
      .select("date,training_load")
      .eq("user_id", userId)
      .gte("date", since)
      .order("date", { ascending: true });

    // Build a date → load map
    const loadByDate: Record<string, number | null> = {};
    (sessions ?? []).forEach((s: any) => {
      loadByDate[s.date] = s.training_load;
    });

    // Map each day of this week to the nearest recent load
    const weekLoads: (number | null)[] = Array.from({ length: 7 }, (_, i) => {
      const d = format(addDays(weekStart, i), "yyyy-MM-dd");
      return loadByDate[d] ?? null;
    });

    const nonNullLoads = weekLoads.filter((l): l is number => l !== null);
    const recentAvg = nonNullLoads.length
      ? nonNullLoads.reduce((a, b) => a + b, 0) / nonNullLoads.length
      : null;

    const newPlan = buildPlan(weekLoads, weekStart, recentAvg);
    setPlan(newPlan);
    setGenerating(false);
    toast({ title: "Plan generated" });
  }, [userId, weekStart]);

  // Initial load
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    generatePlan().finally(() => setLoading(false));
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayPlan = plan.find((p) => isSameDay(p.date, today));

  return (
    <div className="container mx-auto px-4 py-6 pb-nav-safe max-w-lg space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={generating || loading}
          onClick={generatePlan}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? "animate-spin" : ""}`} />
          Regenerate
        </Button>
      </div>

      {/* Today's highlight */}
      {todayPlan && !loading && (
        <button
          onClick={() => setSelected(todayPlan)}
          className={[
            "w-full rounded-2xl border p-4 flex items-start gap-4 text-left transition-all active:scale-[0.99]",
            SESSION_META[todayPlan.session].bg,
            SESSION_META[todayPlan.session].border,
          ].join(" ")}
        >
          {(() => {
            const Icon = SESSION_META[todayPlan.session].icon;
            return <Icon className={`w-8 h-8 ${SESSION_META[todayPlan.session].color} flex-shrink-0 mt-0.5`} />;
          })()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today</span>
              <span className={`text-sm font-bold ${SESSION_META[todayPlan.session].color}`}>
                {todayPlan.session}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{todayPlan.advice}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
        </button>
      )}

      {/* 7-day grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {plan.map((p) => (
            <DayCard
              key={p.date.toISOString()}
              plan={p}
              isToday={isSameDay(p.date, today)}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(SESSION_META) as [SessionType, typeof SESSION_META[SessionType]][]).map(([type, meta]) => {
            const Icon = meta.icon;
            return (
              <div key={type} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${meta.bg} ${meta.border}`}>
                <Icon className={`w-4 h-4 ${meta.color}`} />
                <span className={`text-xs font-semibold ${meta.color}`}>{type}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Methodology note */}
      {!loading && (
        <p className="text-xs text-muted-foreground text-center px-4">
          Plan is generated from your last 7 days of training load data. Tap any day for Yves' advice.
        </p>
      )}

      {/* Day detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[60vh]">
          {selected && (() => {
            const meta = SESSION_META[selected.session];
            const Icon = meta.icon;
            return (
              <SheetHeader className="text-left pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${meta.bg} ${meta.border} border`}>
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                  </div>
                  <div>
                    <SheetTitle className="text-lg">
                      {format(selected.date, "EEEE, d MMMM")}
                    </SheetTitle>
                    <span className={`text-sm font-semibold ${meta.color}`}>{selected.session}</span>
                  </div>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{selected.advice}</p>
                {selected.trainingLoad !== null && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Training load from this date: {Math.round(selected.trainingLoad)}
                  </p>
                )}
              </SheetHeader>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
