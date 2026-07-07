import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const THRESHOLD = 0.7; // a "hit" day
const ymd = (d: Date) => d.toISOString().split("T")[0];

export interface AdherenceStreak {
  streak: number;          // consecutive hit days up to today
  thisWeekPct: number | null;
  lastWeekPct: number | null;
  deltaPct: number | null; // this vs last week
  hasData: boolean;
  isLoading: boolean;
}

/**
 * Derives an adherence streak + weekly recap from plan_adherence. Progress
 * feedback (streaks, week-over-week) is the core habit driver for training apps.
 */
export function useAdherenceStreak(): AdherenceStreak {
  const [state, setState] = useState<AdherenceStreak>({
    streak: 0, thisWeekPct: null, lastWeekPct: null, deltaPct: null, hasData: false, isLoading: true,
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setState((s) => ({ ...s, isLoading: false })); return; }

      const since = new Date(Date.now() - 60 * 864e5);
      const { data } = await supabase
        .from("plan_adherence")
        .select("date, adherence_score")
        .eq("user_id", user.id)
        .gte("date", ymd(since));

      const rows = (data ?? []) as Array<{ date: string; adherence_score: number | null }>;
      if (rows.length === 0) { setState({ streak: 0, thisWeekPct: null, lastWeekPct: null, deltaPct: null, hasData: false, isLoading: false }); return; }

      const byDate = new Map<string, number>();
      rows.forEach((r) => byDate.set(r.date, r.adherence_score ?? 0));

      // Streak: walk back from today; allow today to be missing (not yet logged)
      let streak = 0;
      const cursor = new Date();
      const todayKey = ymd(cursor);
      if (!byDate.has(todayKey)) cursor.setDate(cursor.getDate() - 1);
      for (;;) {
        const key = ymd(cursor);
        const score = byDate.get(key);
        if (score !== undefined && score >= THRESHOLD) { streak++; cursor.setDate(cursor.getDate() - 1); }
        else break;
      }

      const avg = (startAgo: number, endAgo: number) => {
        const vals: number[] = [];
        for (let d = startAgo; d < endAgo; d++) {
          const key = ymd(new Date(Date.now() - d * 864e5));
          if (byDate.has(key)) vals.push(byDate.get(key)!);
        }
        return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length) * 100 : null;
      };
      const thisWeekPct = avg(0, 7);
      const lastWeekPct = avg(7, 14);
      const deltaPct = thisWeekPct !== null && lastWeekPct !== null ? Math.round(thisWeekPct - lastWeekPct) : null;

      setState({
        streak,
        thisWeekPct: thisWeekPct !== null ? Math.round(thisWeekPct) : null,
        lastWeekPct: lastWeekPct !== null ? Math.round(lastWeekPct) : null,
        deltaPct, hasData: true, isLoading: false,
      });
    })();
  }, []);

  return state;
}
