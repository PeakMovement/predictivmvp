import { useState, useEffect } from "react";
import { AlertTriangle, X, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface HealthAnomaly {
  id: string;
  metric_name: string;
  severity: string;
  current_value: number | null;
  baseline_value: number | null;
  deviation_percent: number | null;
  notes: string | null;
  detected_at: string;
}

const METRIC_LABELS: Record<string, string> = {
  hrv_avg: "HRV",
  resting_hr: "Resting Heart Rate",
  sleep_score: "Sleep Quality",
  readiness_score: "Readiness",
  spo2_avg: "Blood Oxygen",
  steps: "Activity Level",
};

function metricLabel(raw: string) {
  return METRIC_LABELS[raw] ?? raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function anomalyMessage(anomaly: HealthAnomaly): string {
  if (anomaly.notes) return anomaly.notes;
  const label = metricLabel(anomaly.metric_name);
  if (anomaly.deviation_percent) {
    const dir = anomaly.deviation_percent > 0 ? "above" : "below";
    return `Your ${label} is ${Math.abs(Math.round(anomaly.deviation_percent))}% ${dir} your usual baseline.`;
  }
  return `An unusual ${label} reading was detected. How are you feeling?`;
}

export function HealthAnomalyBanner() {
  const [anomaly, setAnomaly] = useState<HealthAnomaly | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadAnomaly();
  }, []);

  const loadAnomaly = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("health_anomalies")
      .select("id, metric_name, severity, current_value, baseline_value, deviation_percent, notes, detected_at")
      .eq("user_id", user.id)
      .in("severity", ["high", "critical"])
      .is("acknowledged_at", null)
      .order("detected_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setAnomaly(data as HealthAnomaly);
  };

  const acknowledge = async (anomalyId: string) => {
    await supabase
      .from("health_anomalies")
      .update({ acknowledged_at: new Date().toISOString() })
      .eq("id", anomalyId);
  };

  const handleCheckIn = async () => {
    if (anomaly) await acknowledge(anomaly.id);
    setDismissed(true);
    // Open existing SymptomCheckInSheet
    window.dispatchEvent(new Event("open-symptom-checkin"));
  };

  const handleDismiss = async () => {
    if (anomaly) await acknowledge(anomaly.id);
    setDismissed(true);
  };

  if (!anomaly || dismissed) return null;

  const isCritical = anomaly.severity === "critical";

  return (
    <div
      className={cn(
        "mb-6 rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-start",
        "animate-fade-in",
        isCritical
          ? "bg-orange-500/10 border-orange-500/30"
          : "bg-amber-500/8 border-amber-500/25"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
          isCritical ? "bg-orange-500/20" : "bg-amber-500/15"
        )}
      >
        <HeartPulse
          className={cn("h-5 w-5", isCritical ? "text-orange-400" : "text-amber-400")}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-semibold text-foreground">
            {metricLabel(anomaly.metric_name)} Check-In
          </span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              isCritical
                ? "bg-orange-500/20 text-orange-400"
                : "bg-amber-500/20 text-amber-400"
            )}
          >
            {isCritical ? "Unusual" : "Notable"}
          </span>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          {anomalyMessage(anomaly)}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCheckIn}
          className={cn(
            "text-xs font-medium",
            isCritical
              ? "border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
              : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
          Tell Yves how you feel
        </Button>
      </div>

      {/* Dismiss */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="shrink-0 h-7 w-7 text-muted-foreground hover:text-foreground self-start"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
