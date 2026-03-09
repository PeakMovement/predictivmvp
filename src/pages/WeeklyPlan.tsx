import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Loader2, Sparkles } from "lucide-react";
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
  pill: string;    // pill classes
  card: string;    // card bg + border
  ring: string;    // today ring
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

// ── Day Card ───────────────────────────────────────────────────────────────

function DayCard({
  day,
  onClick,
}: {
  day: DayPlan;
  onClick: () => void;
}) {
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
      {/* Day + date */}
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

      {/* Emoji */}
      <span className="text-xl leading-none">{meta.emoji}</span>

      {/* Session pill */}
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

  const generate = useCallback(async (showToast = false) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke("generate-weekly-plan", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data?.plan) {
        setPlan(data.plan);
        if (showToast) toast({ title: "Plan regenerated" });
      }
    } catch (err) {
      console.error("[WeeklyPlan] generate error:", err);
      toast({
        title: "Failed to generate plan",
        description: err instanceof Error ? err.message : "Try again",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    generate(false).finally(() => setLoading(false));
  }, [generate]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    await generate(true);
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

      {/* 7-day grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {plan.map((day) => (
            <DayCard key={day.date} day={day} onClick={() => setSelected(day)} />
          ))}
        </div>
      )}

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
                  {/* Yves advice */}
                  <div className="rounded-xl bg-muted/30 border border-border/30 p-4">
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      Yves says
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">
                      {selected.advice}
                    </p>
                  </div>

                  {/* Load reference */}
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
