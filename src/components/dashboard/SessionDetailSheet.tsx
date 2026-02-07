import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Heart,
  Moon,
  Footprints,
  Flame,
  TrendingUp,
  Gauge,
  Brain,
  Zap,
  BatteryCharging,
} from "lucide-react";

interface SessionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionDate: string | null; // raw date string like "2025-01-15" or display like "Jan 15"
  sessionDateRaw?: string; // ISO or YYYY-MM-DD for DB queries
}

interface TrainingData {
  training_load: number | null;
  acwr: number | null;
  strain: number | null;
  monotony: number | null;
  acute_load: number | null;
  chronic_load: number | null;
}

interface WearableData {
  hrv_avg: number | null;
  resting_hr: number | null;
  activity_score: number | null;
  total_steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  sleep_score: number | null;
  readiness_score: number | null;
}

const getAcwrZone = (acwr: number | null) => {
  if (acwr == null) return { label: "No data", color: "text-muted-foreground", bg: "bg-muted/30" };
  if (acwr < 0.8) return { label: "Undertrained", color: "text-blue-400", bg: "bg-blue-500/20" };
  if (acwr <= 1.3) return { label: "Optimal", color: "text-emerald-400", bg: "bg-emerald-500/20" };
  if (acwr <= 1.5) return { label: "Caution", color: "text-amber-400", bg: "bg-amber-500/20" };
  return { label: "High Risk", color: "text-red-400", bg: "bg-red-500/20" };
};

const MetricRow = ({
  icon: Icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null;
  unit?: string;
  accent?: string;
}) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon size={15} className={accent || "text-primary"} />
      <span className="text-sm">{label}</span>
    </div>
    <span className="text-sm font-medium text-foreground">
      {value != null ? `${value}${unit || ""}` : "–"}
    </span>
  </div>
);

export const SessionDetailSheet = ({
  open,
  onOpenChange,
  sessionDate,
  sessionDateRaw,
}: SessionDetailSheetProps) => {
  const [training, setTraining] = useState<TrainingData | null>(null);
  const [wearable, setWearable] = useState<WearableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !sessionDateRaw) return;

    const fetchData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      const [trainingRes, wearableRes] = await Promise.all([
        supabase
          .from("training_trends")
          .select("training_load, acwr, strain, monotony, acute_load, chronic_load")
          .eq("user_id", user.id)
          .eq("date", sessionDateRaw)
          .maybeSingle(),
        supabase
          .from("wearable_sessions")
          .select("hrv_avg, resting_hr, activity_score, total_steps, active_calories, total_calories, sleep_score, readiness_score")
          .eq("user_id", user.id)
          .eq("date", sessionDateRaw)
          .maybeSingle(),
      ]);

      setTraining(trainingRes.data as TrainingData | null);
      setWearable(wearableRes.data as WearableData | null);
      setIsLoading(false);
    };

    fetchData();
  }, [open, sessionDateRaw]);

  const acwrZone = getAcwrZone(training?.acwr ?? null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] sm:w-[400px] p-0">
        <SheetHeader className="p-4 pb-2 border-b border-border/50">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity size={18} className="text-primary" />
            Training Day — {sessionDate || "Details"}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-80px)]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 bg-muted/30 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="p-4 space-y-5">
              {/* Load Metrics */}
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Load Metrics
                </h4>
                <div className="bg-card/50 rounded-xl border border-border/40 px-3 divide-y divide-border/30">
                  <MetricRow icon={Zap} label="Training Load" value={training?.training_load != null ? Math.round(training.training_load) : null} />
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Gauge size={15} className="text-primary" />
                      <span className="text-sm">ACWR</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {training?.acwr != null ? training.acwr.toFixed(2) : "–"}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${acwrZone.color} ${acwrZone.bg}`}>
                        {acwrZone.label}
                      </span>
                    </div>
                  </div>
                  <MetricRow icon={TrendingUp} label="Strain" value={training?.strain != null ? Math.round(training.strain) : null} />
                  <MetricRow icon={Brain} label="Monotony" value={training?.monotony != null ? training.monotony.toFixed(2) : null} />
                </div>
              </section>

              {/* Physiological Data */}
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Physiological Data
                </h4>
                <div className="bg-card/50 rounded-xl border border-border/40 px-3 divide-y divide-border/30">
                  <MetricRow icon={Heart} label="HRV Average" value={wearable?.hrv_avg != null ? Math.round(wearable.hrv_avg) : null} unit=" ms" accent="text-red-400" />
                  <MetricRow icon={Heart} label="Resting HR" value={wearable?.resting_hr != null ? Math.round(wearable.resting_hr) : null} unit=" bpm" accent="text-rose-400" />
                  <MetricRow icon={Activity} label="Activity Score" value={wearable?.activity_score} unit="/100" accent="text-emerald-400" />
                  <MetricRow icon={Footprints} label="Total Steps" value={wearable?.total_steps?.toLocaleString() ?? null} accent="text-blue-400" />
                  <MetricRow icon={Flame} label="Active Calories" value={wearable?.active_calories != null ? Math.round(wearable.active_calories) : null} unit=" kcal" accent="text-orange-400" />
                  <MetricRow icon={Flame} label="Total Calories" value={wearable?.total_calories != null ? Math.round(wearable.total_calories) : null} unit=" kcal" accent="text-amber-400" />
                </div>
              </section>

              {/* Recovery Context */}
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Recovery Context
                </h4>
                <div className="bg-card/50 rounded-xl border border-border/40 px-3 divide-y divide-border/30">
                  <MetricRow icon={Moon} label="Sleep Score" value={wearable?.sleep_score} unit="/100" accent="text-indigo-400" />
                  <MetricRow icon={BatteryCharging} label="Readiness Score" value={wearable?.readiness_score} unit="/100" accent="text-emerald-400" />
                </div>
              </section>

              {!training && !wearable && (
                <div className="text-center py-6 text-muted-foreground">
                  <Activity size={28} className="mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No detailed data available for this day.</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
