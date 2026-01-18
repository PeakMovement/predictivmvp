import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAlertSettings } from "@/lib/alertConditions";

interface RiskAlert {
  type: "high_risk" | "anomaly" | "red_flag";
  metric: string;
  value: number;
  threshold: number;
  message: string;
  percentAboveThreshold?: number; // Added for better messaging
}

interface UseRiskAlertTriggerResult {
  currentAlert: RiskAlert | null;
  dismissAlert: () => void;
  checkForAlerts: () => Promise<void>;
  snoozeAlert: (duration: "1_day" | "3_days" | "1_week") => void;
}

// Thresholds for triggering alerts
const RISK_THRESHOLDS = {
  acwr: { high: 1.5, critical: 1.8 },
  strain: { high: 1200, critical: 1500 }, // Adjusted for capped monotony formula
  monotony: { high: 2.0, critical: 2.5 },
  hrv_drop: 20, // % drop from baseline
  readiness_low: 50,
  sleep_low: 60
};

// Snooze durations in hours
const SNOOZE_DURATIONS = {
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
        message: `Predictiv Alert: ${alertMessage} - Check app for details.`
      }
    });

    if (error) {
      console.error("[sendRiskAlertSMS] Error:", error);
      return { success: false, error: error.message };
    }

    console.log("[sendRiskAlertSMS] SMS sent successfully");
    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    console.error("[sendRiskAlertSMS] Exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send SMS" 
    };
  }
}

// Function to send email alert via edge function
export async function sendRiskAlertEmail(
  userId: string, 
  alertType: "injury_risk" | "health_anomaly" | "red_flag_symptom" | "risk_threshold",
  alertMessage: string,
  metric?: string,
  value?: number,
  threshold?: number
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
        triggered_at: new Date().toISOString()
      }
    });

    if (error) {
      console.error("[sendRiskAlertEmail] Error:", error);
      return { success: false, error: error.message };
    }

    if (data?.skipped) {
      console.log("[sendRiskAlertEmail] Skipped (spam prevention):", data.reason);
      return { success: true }; // Not an error, just skipped
    }

    console.log("[sendRiskAlertEmail] Email sent successfully");
    return { success: data?.success || false, error: data?.error };
  } catch (error) {
    console.error("[sendRiskAlertEmail] Exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to send email" 
    };
  }
}

// Session storage key for cooldown tracking
const ALERT_COOLDOWN_KEY = "risk_alert_shown";
// LocalStorage key for 24-hour cooldown
const ALERT_DAILY_COOLDOWN_KEY = "risk_alert_daily_cooldown";
const COOLDOWN_HOURS = 24;

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
  // Store expiry time instead of start time for snoozes
  cooldowns[alertKey] = Date.now() + (hoursToSnooze * 60 * 60 * 1000);
  localStorage.setItem(ALERT_DAILY_COOLDOWN_KEY, JSON.stringify(cooldowns));
}

function isOnDailyCooldown(alertKey: string): boolean {
  const cooldowns = getDailyCooldowns();
  const cooldownValue = cooldowns[alertKey];
  if (!cooldownValue) return false;
  
  // Check if this is an expiry time (snooze) or start time (regular cooldown)
  // If value is in the future, it's an expiry time
  if (cooldownValue > Date.now()) {
    return true; // Still on snooze
  }
  
  // Regular 24-hour cooldown check
  const hoursSince = (Date.now() - cooldownValue) / (1000 * 60 * 60);
  return hoursSince < COOLDOWN_HOURS;
}

export function useRiskAlertTrigger(): UseRiskAlertTriggerResult {
  const [currentAlert, setCurrentAlert] = useState<RiskAlert | null>(null);
  const smsSentRef = useRef<string | null>(null);
  const emailSentRef = useRef<string | null>(null);

  const checkForAlerts = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Session-based cooldown: check if alert was already shown this session
      const shownAlerts = sessionStorage.getItem(ALERT_COOLDOWN_KEY);
      const shownSet = shownAlerts ? new Set(JSON.parse(shownAlerts)) : new Set();

      // Check recovery trends for ACWR, strain, monotony
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
        // Check ACWR
        if (recoveryTrends.acwr && recoveryTrends.acwr >= RISK_THRESHOLDS.acwr.critical) {
          const percentAbove = Math.round((recoveryTrends.acwr / RISK_THRESHOLDS.acwr.critical - 1) * 100);
          alertToSet = {
            type: "high_risk",
            metric: "ACWR",
            value: recoveryTrends.acwr,
            threshold: RISK_THRESHOLDS.acwr.critical,
            percentAboveThreshold: percentAbove,
            message: "Your training load ratio is critically high. Consider reducing intensity to prevent injury."
          };
          emailAlertType = "injury_risk";
        }
        // Check strain
        else if (recoveryTrends.strain && recoveryTrends.strain >= RISK_THRESHOLDS.strain.critical) {
          const percentAbove = Math.round((recoveryTrends.strain / RISK_THRESHOLDS.strain.critical - 1) * 100);
          alertToSet = {
            type: "high_risk",
            metric: "Strain",
            value: recoveryTrends.strain,
            threshold: RISK_THRESHOLDS.strain.critical,
            percentAboveThreshold: percentAbove,
            message: "Your accumulated training strain is very high. Recovery is recommended."
          };
          emailAlertType = "injury_risk";
        }
        // Check monotony
        else if (recoveryTrends.monotony && recoveryTrends.monotony >= RISK_THRESHOLDS.monotony.critical) {
          const percentAbove = Math.round((recoveryTrends.monotony / RISK_THRESHOLDS.monotony.critical - 1) * 100);
          alertToSet = {
            type: "high_risk",
            metric: "Monotony",
            value: recoveryTrends.monotony,
            threshold: RISK_THRESHOLDS.monotony.critical,
            percentAboveThreshold: percentAbove,
            message: "Your training variation is very low. Consider diversifying your workouts."
          };
          emailAlertType = "risk_threshold";
        }
      }

      // Check wearable session for low readiness/sleep and HRV drop
      if (!alertToSet) {
        // Fetch last 14 days of wearable data for HRV baseline calculation
        const { data: sessions } = await supabase
          .from("wearable_sessions")
          .select("readiness_score, sleep_score, hrv_avg, date")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(14);

        const todaySession = sessions?.[0];

        if (todaySession) {
          // Check readiness first
          if (todaySession.readiness_score && todaySession.readiness_score < RISK_THRESHOLDS.readiness_low) {
            alertToSet = {
              type: "anomaly",
              metric: "Readiness",
              value: todaySession.readiness_score,
              threshold: RISK_THRESHOLDS.readiness_low,
              message: "Your readiness score is unusually low. How are you feeling?"
            };
            emailAlertType = "health_anomaly";
          } 
          // Check sleep
          else if (todaySession.sleep_score && todaySession.sleep_score < RISK_THRESHOLDS.sleep_low) {
            alertToSet = {
              type: "anomaly",
              metric: "Sleep",
              value: todaySession.sleep_score,
              threshold: RISK_THRESHOLDS.sleep_low,
              message: "Your sleep quality was poor. Consider logging any symptoms."
            };
            emailAlertType = "health_anomaly";
          }
          // Check HRV drop from baseline (requires at least 3 days of data)
          else if (sessions && sessions.length >= 3) {
            const todayHrv = todaySession.hrv_avg;
            const baselineHrvValues = sessions
              .slice(1) // Exclude today
              .filter(s => s.hrv_avg != null)
              .map(s => s.hrv_avg as number);

            if (todayHrv && baselineHrvValues.length >= 2) {
              const baselineHrv = baselineHrvValues.reduce((a, b) => a + b, 0) / baselineHrvValues.length;
              const dropPercentage = ((baselineHrv - todayHrv) / baselineHrv) * 100;

              if (dropPercentage >= RISK_THRESHOLDS.hrv_drop) {
                alertToSet = {
                  type: "anomaly",
                  metric: "HRV",
                  value: todayHrv,
                  threshold: Math.round(baselineHrv * 0.8), // 80% of baseline
                  message: `Your HRV is down ${Math.round(dropPercentage)}% from your usual. Your body may need extra recovery today.`
                };
                emailAlertType = "health_anomaly";
              }
            }
          }
        }
      }

      // Check health anomalies
      if (!alertToSet) {
        const { data: anomalies } = await supabase
          .from("health_anomalies")
          .select("*")
          .eq("user_id", user.id)
          .is("acknowledged_at", null)
          .order("detected_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anomalies && anomalies.severity === "high") {
          alertToSet = {
            type: "red_flag",
            metric: anomalies.metric_name,
            value: anomalies.current_value || 0,
            threshold: anomalies.baseline_value || 0,
            message: anomalies.notes || `Unusual ${anomalies.metric_name} detected. Please check in.`
          };
          emailAlertType = "health_anomaly";
        }
      }

      // Set the alert and send notifications if needed
      if (alertToSet) {
        const alertKey = `${alertToSet.metric}_${alertToSet.type}`;
        
        // Skip if this alert type was already shown this session (cooldown)
        if (shownSet.has(alertKey)) {
          return;
        }

        // Skip if on 24-hour cooldown (persists across sessions)
        if (isOnDailyCooldown(alertKey)) {
          console.log(`[useRiskAlertTrigger] Alert ${alertKey} on 24h cooldown, skipping`);
          return;
        }
        
        // Mark this alert as shown in session storage AND 24h cooldown
        shownSet.add(alertKey);
        sessionStorage.setItem(ALERT_COOLDOWN_KEY, JSON.stringify([...shownSet]));
        setDailyCooldown(alertKey);
        
        setCurrentAlert(alertToSet);
        
        // Send SMS if enabled and not already sent for this alert
        if (smsSentRef.current !== alertKey) {
          const settings = getAlertSettings();
          if (settings.enableSMS && settings.phoneNumber) {
            smsSentRef.current = alertKey;
            await sendRiskAlertSMS(settings.phoneNumber, alertToSet.message);
          }
        }

        // Send Email notification (always, with built-in spam prevention)
        if (emailSentRef.current !== alertKey) {
          emailSentRef.current = alertKey;
          await sendRiskAlertEmail(
            user.id,
            emailAlertType,
            alertToSet.message,
            alertToSet.metric,
            alertToSet.value,
            alertToSet.threshold
          );
        }
      }

    } catch (error) {
      console.error("Error checking for risk alerts:", error);
    }
  }, []);

  const dismissAlert = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  const snoozeAlert = useCallback((duration: SnoozeDuration) => {
    if (currentAlert) {
      const alertKey = `${currentAlert.metric}_${currentAlert.type}`;
      setSnoozeCooldown(alertKey, duration);
      console.log(`[useRiskAlertTrigger] Snoozed ${alertKey} for ${duration.replace('_', ' ')}`);
      setCurrentAlert(null);
    }
  }, [currentAlert]);

  // Check on mount
  useEffect(() => {
    checkForAlerts();
  }, [checkForAlerts]);

  return {
    currentAlert,
    dismissAlert,
    checkForAlerts,
    snoozeAlert
  };
}
