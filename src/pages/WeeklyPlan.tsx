import { useState, useEffect } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { format, parseISO, isToday } from "date-fns";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

type SessionType = "Rest" | "Easy" | "Moderate" | "Hard";

interface DayPlan {
  date: string;
  dayLabel: string;
  session: SessionType;
  trainingLoad: number | null;
  advice: string;
}

// ── Session metadata ───────────────────────────────────────────────────────

const SESSION_META: Record<SessionType, {
  emoji: string;
  pill: string;
  card: string;
  ring: string;
  label: string;
}> = {
  Rest: {
    emoji: "😴",
    label: "REST",
    pill: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    card: "bg-slate-500/5 border-slate-500/20",
    ring: "ring-slate-400/40",
  },
  Easy: {
    emoji: "🚶",
    label: "EASY",
    pill: "bg-green-500/15 text-green-400 border-green-500/25",
    card: "bg-green-500/5 border-green-500/20",
    ring: "ring-green-400/40",
  },
  Moderate: {
    emoji: "🏃",
    label: "MODERATE",
    pill: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    card: "bg-yellow-500/5 border-yellow-500/20",
    ring: "ring-yellow-400/40",
  },
  Hard: {
    emoji: "💪",
    label: "HARD",
    pill: "bg-red-500/15 text-red-400 border-red-500/25",
    card: "bg-red-500/5 border-red-500/20",
    ring: "ring-red-400/40",
  },
};

// ── Static fallback advice ─────────────────────────────────────────────────

const FALLBACK_ADVICE: Record<SessionType, string> = {
  Rest: "Full rest day — prioritise sleep, hydration, and nutrition. Let your body absorb the training.",
  Easy: "Zone 2 effort only. Keep it conversational — you should be able to speak in full sentences throughout.",
  Moderate: "Structured moderate effort at 70–80% max HR. Focus on quality over quantity.",
  Hard: "High-intensity session — intervals or strength work. Warm up thoroughly and give it a real effort.",
};

// ── Classification ─────────────────────────────────────────────────────────

const DEFAULT_PLAN: SessionType[] = ["Hard", "Moderate", "Moderate", "Easy", "Hard", "Moderate", "Rest"];

function classifyDay(
  prevDayLoad: number | null,
  sevenDayAvg: number | null,
  lowStreakDays: number,
): SessionType {
  if (prevDayLoad !== null && prevDayLoad > 400) return "Rest";
  if (sevenDayAvg !== null && sevenDayAvg > 300) return "Easy";
  if (lowStreakDays >= 2) return "Hard";
  return "Moderate";
}

// ── Build week dates (Mon–Sun) ─────────────────────────────────────────────

function getWeekDates(): Date[] {
  const today = new Date();
  const todayDay = today.getDay();
  const daysFromMonday = todayDay === 0 ? 6 : todayDay - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ── Compute plan client-side ───────────────────────────────────────────────

async function computePlan(): Promise<DayPlan[]> {
  const weekDates = getWeekDates();

  // Fetch last 14 days of wearable data
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceStr = since.toISOString().split("T")[0];

  const { data: sessions } = await supabase
    .from("wearable_sessions")
    .select("date, training_load")
    .gte("date", sinceStr)
    .order("date", { ascending: true });

  const loadByDate: Record<string, number | null> = {};
  (sessions ?? []).forEach((s: any) => {
    loadByDate[s.date] = s.training_load;
  });

  const hasAnyData = (sessions ?? []).length > 0;

  // 7-day average
  const recentLoads = Object.values(loadByDate).filter((v): v is number => v !== null);
  const sevenDayAvg = recentLoads.length
    ? recentLoads.reduce((a, b) => a + b, 0) / recentLoads.length
    : null;

  let lowStreakDays = 0;
  const LOW_LOAD_THRESHOLD = 150;

  const dayPlans: DayPlan[] = weekDates.map((date, i) => {
    const dateStr = date.toISOString().split("T")[0];
    const load = loadByDate[dateStr] ?? null;

    const prevDate = new Date(date);
    prevDate.setDate(date.getDate() - 1);
    const prevLoad = loadByDate[prevDate.toISOString().split("T")[0]] ?? null;

    if (load !== null && load < LOW_LOAD_THRESHOLD) {
      lowStreakDays++;
    } else {
      lowStreakDays = 0;
    }

    const session: SessionType = !hasAnyData
      ? DEFAULT_PLAN[i]
      : classifyDay(prevLoad, sevenDayAvg, lowStreakDays);

    return {
      date: dateStr,
      dayLabel: DAY_LABELS[i],
      session,
      trainingLoad: load,
      advice: FALLBACK_ADVICE[session],
    };
  });

  return dayPlans;
}

// ── Enhance with AI advice via edge function ───────────────────────────────

async function enhanceWithAI(basePlan: DayPlan[]): Promise<DayPlan[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return basePlan;

  const { data, error } = await supabase.functions.invoke("generate-weekly-plan", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error || !data?.plan || !Array.isArray(data.plan) || data.plan.length !== 7) {
    return basePlan;
  }

  // Merge AI advice onto base plan (keep client-side session classification)
  return basePlan.map((day, i) => ({
    ...day,
    advice: data.plan[i]?.advice ?? day.advice,
  }));
}

// ── Day Card ───────────────────────────────────────────────────────────────

function DayCard({ day, onClick }: { day: DayPlan; onClick: () => void }) {
  const meta = SESSION_META[day.session];
  const todayFlag = isToday(parseISO(day.date));

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 touch-manipulation w-full",
        meta.card,
        todayFlag && `ring-2 ${meta.ring} shadow-md`,
      )}
    >
      <div className="text-center">
        <p className={cn(
          "text-xs font-bold uppercase tracking-wide",
          todayFlag ? "text-foreground" : "text-muted-foreground"
        )}>
          {day.dayLabel}
        </p>
        <p className={cn(
          "text-xs mt-0.5",
          todayFlag ? "text-foreground" : "text-muted-foreground/70"
        )}>
          {format(parseISO(day.date), "d MMM")}
        </p>
      </div>

      <span className="text-xl leading-none">{meta.emoji}</span>

      <span className={cn(
        "text-[9px] font-bold tracking-wider px-2 py-0.5 rounded-full border",
        meta.pill,
      )}>
        {meta.label}
      </span>
    </button>
  );
}

// ── Weekly Summary ─────────────────────────────────────────────────────────

function WeeklySummary({ plan }: { plan: DayPlan[] }) {
  const counts = plan.reduce<Record<SessionType, number>>(
    (acc, d) => { acc[d.session]++; return acc; },
    { Hard: 0, Moderate: 0, Easy: 0, Rest: 0 }
  );

  const parts: string[] = [];
  if (counts.Hard > 0) parts.push(`${counts.Hard} hard`);
  if (counts.Moderate > 0) parts.push(`${counts.Moderate} moderate`);
  if (counts.Easy > 0) parts.push(`${counts.Easy} easy`);
  if (counts.Rest > 0) parts.push(`${counts.Rest} rest`);

  return (
    <div className="rounded-2xl border border-border/30 bg-card/40 p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
        Weekly Summary
      </p>
      <div className="flex flex-wrap gap-2">
        {(["Hard", "Moderate", "Easy", "Rest"] as SessionType[]).map((s) => {
          if (counts[s] === 0) return null;
          const meta = SESSION_META[s];
          return (
            <span
              key={s}
              className={cn(
                "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border",
                meta.pill
              )}
            >
              <span>{meta.emoji}</span>
              <span>{counts[s]} {s}</span>
            </span>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Planned: {parts.join(", ")}
      </p>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function WeeklyPlan() {
  const { toast } = useToast();
  const [plan, setPlan] = useState<DayPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selected, setSelected] = useState<DayPlan | null>(null);

  const loadPlan = async (showToast = false) => {
    try {
      // Always compute client-side first so grid renders immediately
      const base = await computePlan();
      setPlan(base);

      // Then try to enhance advice with AI (non-blocking upgrade)
      enhanceWithAI(base).then((enhanced) => {
        setPlan(enhanced);
      }).catch(() => {/* silently keep base */});

      if (showToast) toast({ title: "Plan regenerated" });
    } catch (err) {
      console.error("[WeeklyPlan] load error:", err);
      // Last resort: show default plan with static advice
      const weekDates = getWeekDates();
      const fallback: DayPlan[] = weekDates.map((date, i) => {
        const session = DEFAULT_PLAN[i];
        return {
          date: date.toISOString().split("T")[0],
          dayLabel: DAY_LABELS[i],
          session,
          trainingLoad: null,
          advice: FALLBACK_ADVICE[session],
        };
      });
      setPlan(fallback);
      if (showToast) toast({
        title: "Couldn't refresh plan",
        description: "Showing default schedule",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setLoading(true);
    loadPlan(false).finally(() => setLoading(false));
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    await loadPlan(true);
    setRegenerating(false);
  };

  const today = new Date();
  const mondayDate = (() => {
    const d = new Date(today);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return d;
  })();

  return (
    <div className="container mx-auto px-4 py-6 pb-nav-safe max-w-lg space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Weekly Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {format(mondayDate, "d MMM")}
            {" – "}
            {format(new Date(mondayDate.getTime() + 6 * 86400000), "d MMM yyyy")}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading || regenerating}
          onClick={handleRegenerate}
          className="gap-2"
        >
          <RefreshCw className={cn("w-4 h-4", regenerating && "animate-spin")} />
          Regenerate
        </Button>
      </div>

      {/* Yves label */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span>Yves-generated based on your last 7 days of training load. Tap a day for advice.</span>
      </div>

      {/* 7-day grid — horizontally scrollable on mobile so cards stay readable */}
      <div className="overflow-x-auto -mx-4 px-4 pb-1">
        {loading ? (
          <div className="grid grid-cols-7 gap-1.5 min-w-[476px]">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5 min-w-[476px]">
            {plan.map((day) => (
              <DayCard key={day.date} day={day} onClick={() => setSelected(day)} />
            ))}
          </div>
        )}
      </div>

      {/* Weekly summary */}
      {!loading && plan.length > 0 && <WeeklySummary plan={plan} />}

      {/* Day detail sheet */}
      <Sheet open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          {selected && (() => {
            const meta = SESSION_META[selected.session];
            const todayFlag = isToday(parseISO(selected.date));
            return (
              <>
                <SheetHeader className="text-left pb-4">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-3xl">{meta.emoji}</span>
                    <div>
                      <SheetTitle className="text-lg leading-tight">
                        {format(parseISO(selected.date), "EEEE, d MMMM")}
                        {todayFlag && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">· Today</span>
                        )}
                      </SheetTitle>
                      <span className={cn(
                        "inline-flex mt-1 text-xs font-bold tracking-wider px-2 py-0.5 rounded-full border",
                        meta.pill,
                      )}>
                        {meta.label}
                      </span>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-3 pb-2">
                  <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Yves says
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {selected.advice}
                    </p>
                  </div>

                  {selected.trainingLoad !== null && (
                    <p className="text-xs text-muted-foreground px-1">
                      Training load on this date: {Math.round(selected.trainingLoad)}
                    </p>
                  )}
                </div>

                <SheetFooter className="pt-3">
                  <Button className="w-full" onClick={() => setSelected(null)}>
                    Got it
                  </Button>
                </SheetFooter>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
