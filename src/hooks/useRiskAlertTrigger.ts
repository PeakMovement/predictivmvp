import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAlertSettings } from "@/lib/alertConditions";

interface RiskAlert {
  type: "high_risk" | "anomaly" | "red_flag";
  metric: string;
  value: number;
  threshold: number;
  message: string;
  percentAboveThreshold?: number;
}

interface UseRiskAlertTriggerResult {
  currentAlert: RiskAlert | null;
  dismissAlert: () => void;
  checkForAlerts: () => Promise<void>;
  snoozeAlert: (duration: "1_hour" | "1_day" | "3_days" | "1_week") => void;
}

// Thresholds for triggering alerts
const RISK_THRESHOLDS = {
  acwr: { high: 1.5, critical: 1.8 },
  strain: { high: 1200, critical: 1500 },
  monotony: { high: 1.8, critical: 2.2 },
  hrv_drop: 20, // % drop from baseline
  readiness_low: 50,
  sleep_low: 60,
};

// Snooze durations in hours
const SNOOZE_DURATIONS = {
  "1_hour": 1,
  "1_day": 24,
  "3_days": 72,
  "1_week": 168,
} as const;

type SnoozeDuration = keyof typeof SNOOZE_DURATIONS;

// Function to send SMS alert via edge function
export async function sendRiskAlertSMS(phoneNumber: string, alertMessage: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-sms-alert", {
      body: {
        to: phoneNumber,
        message: `Predictiv Alert: ${alertMessage} - Check app for details.`,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send SMS" };
  }
}

// Function to send email alert via edge function
export async function sendRiskAlertEmail(
  userId: string,
  alertType: "injury_risk" | "health_anomaly" | "red_flag_symptom" | "risk_threshold",
  alertMessage: string,
  metric?: string,
  value?: number,
  threshold?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("send-risk-email", {
      body: {
        user_id: userId,
        alert_type: alertType,
        alert_message: alertMessage,
        metric,
        value,
        threshold,
        triggered_at: new Date().toISOString(),
      },
    });
    if (error) return { success: false, error: error.message };
    if (data?.skipped) return { success: true };
    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
  }
}

// Session storage key for cooldown tracking
const ALERT_COOLDOWN_KEY = "risk_alert_shown";
// LocalStorage key for 7-day cooldown
const ALERT_DAILY_COOLDOWN_KEY = "risk_alert_daily_cooldown";
const COOLDOWN_HOURS = 168; // 7 days

function getDailyCooldowns(): Record<string, number> {
  try {
    const stored = localStorage.getItem(ALERT_DAILY_COOLDOWN_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setDailyCooldown(alertKey: string): void {
  const cooldowns = getDailyCooldowns();
  cooldowns[alertKey] = Date.now();
  localStorage.setItem(ALERT_DAILY_COOLDOWN_KEY, JSON.stringify(cooldowns));
}

function setSnoozeCooldown(alertKey: string, duration: SnoozeDuration): void {
  const cooldowns = getDailyCooldowns();
  const hoursToSnooze = SNOOZE_DURATIONS[duration];
  cooldowns[alertKey] = Date.now() + hoursToSnooze * 60 * 60 * 1000;
  localStorage.setItem(ALERT_DAILY_COOLDOWN_KEY, JSON.stringify(cooldowns));
}

function isOnDailyCooldown(alertKey: string): boolean {
  const cooldowns = getDailyCooldowns();
  const cooldownValue = cooldowns[alertKey];
  if (!cooldownValue) return false;
  if (cooldownValue > Date.now()) return true; // snooze expiry
  const hoursSince = (Date.now() - cooldownValue) / (1000 * 60 * 60);
  return hoursSince < COOLDOWN_HOURS;
}

// Severity derived from alert type
function alertSeverity(type: RiskAlert["type"]): "low" | "medium" | "high" | "critical" {
  if (type === "red_flag") return "critical";
  if (type === "high_risk") return "high";
  return "medium";
}

// Insert alert into alert_history if there's no active one for this metric in the last 7 days
async function persistAlert(userId: string, alert: RiskAlert): Promise<void> {
  try {
    const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("alert_history")
      .select("id")
      .eq("user_id", userId)
      .eq("metric_name", alert.metric)
      .eq("status", "active")
      .gte("created_at", since)
      .maybeSingle();

    if (!existing) {
      await supabase.from("alert_history").insert({
        user_id: userId,
        alert_type: alert.type,
        metric_name: alert.metric,
        metric_value: alert.value,
        threshold_value: alert.threshold,
        message: alert.message,
        severity: alertSeverity(alert.type),
        status: "active",
      });
    }
  } catch (err) {
    console.error("[useRiskAlertTrigger] Failed to persist alert:", err);
  }
}

export function useRiskAlertTrigger(): UseRiskAlertTriggerResult {
  const [currentAlert, setCurrentAlert] = useState<RiskAlert | null>(null);
  const smsSentRef = useRef<string | null>(null);
  const emailSentRef = useRef<string | null>(null);

  const checkForAlerts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // FIX 3: Load user alert_settings — fall back to RISK_THRESHOLDS if no row exists
      const { data: alertSettings } = await supabase
        .from("alert_settings")
        .select("acwr_critical_threshold, strain_critical_threshold, monotony_critical_threshold, hrv_drop_threshold, readiness_score_threshold, sleep_score_threshold")
        .eq("user_id", user.id)
        .maybeSingle();

      const thresholds = {
        acwr: { high: RISK_THRESHOLDS.acwr.high, critical: alertSettings?.acwr_critical_threshold ?? RISK_THRESHOLDS.acwr.critical },
        strain: { high: RISK_THRESHOLDS.strain.high, critical: alertSettings?.strain_critical_threshold ?? RISK_THRESHOLDS.strain.critical },
        monotony: { high: RISK_THRESHOLDS.monotony.high, critical: alertSettings?.monotony_critical_threshold ?? RISK_THRESHOLDS.monotony.critical },
        hrv_drop: alertSettings?.hrv_drop_threshold ?? RISK_THRESHOLDS.hrv_drop,
        readiness_low: alertSettings?.readiness_score_threshold ?? RISK_THRESHOLDS.readiness_low,
        sleep_low: alertSettings?.sleep_score_threshold ?? RISK_THRESHOLDS.sleep_low,
      };

      // Session-based cooldown
      const shownAlerts = sessionStorage.getItem(ALERT_COOLDOWN_KEY);
      const shownSet = shownAlerts ? new Set(JSON.parse(shownAlerts)) : new Set();

      // DB-backed dismissals
      const { data: dbDismissals } = await supabase
        .from("risk_alert_dismissals")
        .select("alert_key, dismissed_at, snooze_until")
        .eq("user_id", user.id);

      const dismissalMap = new Map(
        (dbDismissals || []).map(d => [d.alert_key, d]),
      );

      // ── Check recovery trends (ACWR, strain, monotony) ────────────────────
      const { data: recoveryTrends } = await supabase
        .from("recovery_trends")
        .select("acwr, strain, monotony, period_date")
        .eq("user_id", user.id)
        .order("period_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      let alertToSet: RiskAlert | null = null;
      let emailAlertType: "injury_risk" | "health_anomaly" | "red_flag_symptom" | "risk_threshold" = "risk_threshold";

      if (recoveryTrends) {
        if (recoveryTrends.acwr && recoveryTrends.acwr > thresholds.acwr.critical) {
          alertToSet = {
            type: "high_risk",
            metric: "ACWR",
            value: recoveryTrends.acwr,
            threshold: thresholds.acwr.critical,
            percentAboveThreshold: Math.round((recoveryTrends.acwr / thresholds.acwr.critical - 1) * 100),
            message: `Overtraining risk detected — your acute:chronic ratio is ${recoveryTrends.acwr.toFixed(2)}, reduce intensity now.`,
          };
          emailAlertType = "injury_risk";
        } else if (recoveryTrends.strain && recoveryTrends.strain > thresholds.strain.critical) {
          alertToSet = {
            type: "high_risk",
            metric: "Strain",
            value: recoveryTrends.strain,
            threshold: thresholds.strain.critical,
            percentAboveThreshold: Math.round((recoveryTrends.strain / thresholds.strain.critical - 1) * 100),
            message: "Overtraining risk detected — accumulated strain is critically high. Take a recovery day.",
          };
          emailAlertType = "injury_risk";
        } else if (recoveryTrends.monotony && recoveryTrends.monotony > thresholds.monotony.critical) {
          alertToSet = {
            type: "high_risk",
            metric: "Monotony",
            value: recoveryTrends.monotony,
            threshold: thresholds.monotony.critical,
            percentAboveThreshold: Math.round((recoveryTrends.monotony / thresholds.monotony.critical - 1) * 100),
            message: "High training monotony — vary your training intensity to reduce injury risk.",
          };
          emailAlertType = "risk_threshold";
        }
      }

      // ── Check wearable sessions (readiness, sleep) + FIX 4: HRV from user_baselines ──
      if (!alertToSet) {
        // FIX 4: Fetch HRV baseline from user_baselines (30-day rolling) rather than computing locally
        const [sessionsResult, hrvBaselineResult] = await Promise.all([
          supabase
            .from("wearable_sessions")
            .select("readiness_score, sleep_score, hrv_avg, date")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .limit(3),
          supabase
            .from("user_baselines")
            .select("rolling_avg")
            .eq("user_id", user.id)
            .eq("metric", "hrv")
            .maybeSingle(),
        ]);

        const sessions = sessionsResult.data;
        const baselineHrv = hrvBaselineResult.data?.rolling_avg ?? null;
        const todaySession = sessions?.[0];

        if (todaySession) {
          if (todaySession.readiness_score && todaySession.readiness_score < thresholds.readiness_low) {
            alertToSet = {
              type: "anomaly",
              metric: "Readiness",
              value: todaySession.readiness_score,
              threshold: thresholds.readiness_low,
              message: `Your readiness score is ${todaySession.readiness_score} — unusually low. How are you feeling?`,
            };
            emailAlertType = "health_anomaly";
          } else if (todaySession.sleep_score && todaySession.sleep_score < thresholds.sleep_low) {
            alertToSet = {
              type: "anomaly",
              metric: "Sleep",
              value: todaySession.sleep_score,
              threshold: thresholds.sleep_low,
              message: `Poor sleep affecting recovery — sleep score ${todaySession.sleep_score} is below your threshold.`,
            };
            emailAlertType = "health_anomaly";
          } else if (todaySession.hrv_avg && baselineHrv) {
            const dropPct = ((baselineHrv - todaySession.hrv_avg) / baselineHrv) * 100;
            if (dropPct >= thresholds.hrv_drop) {
              alertToSet = {
                type: "anomaly",
                metric: "HRV",
                value: todaySession.hrv_avg,
                threshold: Math.round(baselineHrv * (1 - thresholds.hrv_drop / 100)),
                message: `HRV significantly below baseline — down ${Math.round(dropPct)}% from your usual. Prioritise recovery today.`,
              };
              emailAlertType = "health_anomaly";
            }
          }
        }
      }

      // ── Check health anomalies ────────────────────────────────────────────
      if (!alertToSet) {
        const { data: anomaly } = await supabase
          .from("health_anomalies")
          .select("*")
          .eq("user_id", user.id)
          .is("acknowledged_at", null)
          .eq("severity", "high")
          .order("detected_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anomaly) {
          alertToSet = {
            type: "red_flag",
            metric: anomaly.metric_name,
            value: anomaly.current_value || 0,
            threshold: anomaly.baseline_value || 0,
            message: anomaly.notes || `Unusual ${anomaly.metric_name} detected. Please check in.`,
          };
          emailAlertType = "health_anomaly";
        }
      }

      if (!alertToSet) return;

      const alertKey = `${alertToSet.metric}_${alertToSet.type}`;

      // Skip if already shown this session
      if (shownSet.has(alertKey)) return;

      // Skip if on DB-backed cooldown / snooze
      const dbDismissal = dismissalMap.get(alertKey);
      if (dbDismissal) {
        const now = new Date();
        if (dbDismissal.snooze_until && new Date(dbDismissal.snooze_until) > now) return;
        if (dbDismissal.dismissed_at) {
          const hoursSince = (now.getTime() - new Date(dbDismissal.dismissed_at).getTime()) / (1000 * 60 * 60);
          if (hoursSince < COOLDOWN_HOURS) return;
        }
      }

      // Skip if on local cooldown
      if (isOnDailyCooldown(alertKey)) return;

      // Mark shown
      shownSet.add(alertKey);
      sessionStorage.setItem(ALERT_COOLDOWN_KEY, JSON.stringify([...shownSet]));
      setDailyCooldown(alertKey);

      setCurrentAlert(alertToSet);

      // Persist to alert_history
      await persistAlert(user.id, alertToSet);

      // Notifications
      if (smsSentRef.current !== alertKey) {
        const settings = getAlertSettings();
        if (settings.enableSMS && settings.phoneNumber) {
          smsSentRef.current = alertKey;
          await sendRiskAlertSMS(settings.phoneNumber, alertToSet.message);
        }
      }

      if (emailSentRef.current !== alertKey) {
        emailSentRef.current = alertKey;
        await sendRiskAlertEmail(user.id, emailAlertType, alertToSet.message, alertToSet.metric, alertToSet.value, alertToSet.threshold);
      }
    } catch (error) {
      console.error("[useRiskAlertTrigger] Error checking for alerts:", error);
    }
  }, []);

  const dismissAlert = useCallback(async () => {
    if (currentAlert) {
      const alertKey = `${currentAlert.metric}_${currentAlert.type}`;
      const snoozeUntil = new Date(Date.now() + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("risk_alert_dismissals")
          .upsert({ user_id: user.id, alert_key: alertKey, dismissed_at: new Date().toISOString(), snooze_until: snoozeUntil }, { onConflict: "user_id,alert_key" });

        // Also dismiss matching active record in alert_history
        await supabase
          .from("alert_history")
          .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("metric_name", currentAlert.metric)
          .eq("status", "active");
      }

      setDailyCooldown(alertKey);
    }
    setCurrentAlert(null);
  }, [currentAlert]);

  const snoozeAlert = useCallback(async (duration: SnoozeDuration) => {
    if (currentAlert) {
      const alertKey = `${currentAlert.metric}_${currentAlert.type}`;
      const hoursToSnooze = SNOOZE_DURATIONS[duration];
      const snoozeUntil = new Date(Date.now() + hoursToSnooze * 60 * 60 * 1000).toISOString();

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("risk_alert_dismissals")
          .upsert({ user_id: user.id, alert_key: alertKey, dismissed_at: new Date().toISOString(), snooze_until: snoozeUntil }, { onConflict: "user_id,alert_key" });
      }

      setSnoozeCooldown(alertKey, duration);
      setCurrentAlert(null);
    }
  }, [currentAlert]);

  useEffect(() => {
    checkForAlerts();
  }, [checkForAlerts]);

  return { currentAlert, dismissAlert, checkForAlerts, snoozeAlert };
}
