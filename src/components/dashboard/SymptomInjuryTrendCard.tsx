import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDown, ArrowUp, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Checkin { severity: string | null; created_at: string; symptom_type: string | null; }
interface Injury { body_location: string | null; severity: string | null; is_active: boolean | null; injury_date: string | null; }

const SEV: Record<string, number> = { none: 0, mild: 1, low: 1, moderate: 2, medium: 2, severe: 3, high: 3, critical: 3 };
const sevScore = (s: string | null) => SEV[(s ?? "").toLowerCase()] ?? 1;

/**
 * Surfaces self-reported signal (symptom check-ins + active injuries) that
 * otherwise sits unused, next to the wearable-driven metrics. Closes the loop
 * between what the athlete reports and what Predictiv predicts.
 */
export function SymptomInjuryTrendCard() {
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const [{ data: c }, { data: inj }] = await Promise.all([
        supabase.from("symptom_check_ins")
          .select("severity, created_at, symptom_type")
          .eq("user_id", user.id).gte("created_at", since)
          .order("created_at", { ascending: true }),
        (supabase.from as (t: string) => ReturnType<typeof supabase.from>)("user_injury_profiles")
          .select("body_location, severity, is_active, injury_date")
          .eq("user_id", user.id).eq("is_active", true)
          .order("injury_date", { ascending: false }),
      ]);
      setCheckins((c as Checkin[]) ?? []);
      setInjuries((inj as unknown as Injury[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const { last14, prev14, trend, spark } = useMemo(() => {
    const now = Date.now();
    const l14 = checkins.filter((c) => new Date(c.created_at).getTime() >= now - 14 * 864e5);
    const p14 = checkins.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t < now - 14 * 864e5 && t >= now - 28 * 864e5;
    });
    const t = l14.length - p14.length;
    return { last14: l14.length, prev14: p14.length, trend: t, spark: checkins.slice(-14).map((c) => sevScore(c.severity)) };
  }, [checkins]);

  if (loading) {
    return <div className="bg-glass rounded-md border border-glass-border p-6 animate-pulse"><div className="h-6 bg-muted/30 rounded w-1/3 mb-4" /><div className="h-16 bg-muted/30 rounded w-full" /></div>;
  }

  const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus;
  const trendColor = trend > 0 ? "text-red-400" : trend < 0 ? "text-bioGreen" : "text-muted-foreground";
  const maxSpark = Math.max(1, ...spark);

  return (
    <div className="bg-glass rounded-md border border-glass-border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md flex items-center justify-center border text-coldBlue bg-coldBlue/10 border-coldBlue/20">
            <Activity size={22} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Symptoms &amp; Injuries</h3>
            <p className="text-xs text-muted-foreground">What you&apos;ve reported, last 30 days</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-semibold", trendColor)}>
          <TrendIcon size={16} />
          {last14} <span className="text-muted-foreground font-normal">/ 14d</span>
        </div>
      </div>

      {checkins.length === 0 && injuries.length === 0 ? (
        <div className="border border-muted/30 bg-muted/10 rounded-md p-4 text-center">
          <p className="text-sm text-muted-foreground">Nothing reported recently.</p>
          <p className="text-xs text-muted-foreground">Check in when something feels off — it sharpens your risk score.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {spark.length > 0 && (
            <div>
              <p className="text-[12px] text-muted-foreground mb-1">Symptom severity trend</p>
              <div className="flex items-end gap-1 h-12">
                {spark.map((v, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-coldBlue/60"
                    style={{ height: `${(v / maxSpark) * 100}%`, minHeight: "3px" }} />
                ))}
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                {trend === 0 ? "Steady vs the prior 14 days" : `${Math.abs(trend)} ${trend > 0 ? "more" : "fewer"} than the prior 14 days`}
              </p>
            </div>
          )}
          {injuries.length > 0 && (
            <div>
              <p className="text-[12px] text-muted-foreground mb-1.5">Active injuries</p>
              <div className="flex flex-wrap gap-2">
                {injuries.map((inj, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md text-xs border border-amber/30 bg-amber/10 text-yellow-500 dark:text-yellow-400">
                    {inj.body_location ?? "Injury"}{inj.severity ? ` · ${inj.severity}` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
