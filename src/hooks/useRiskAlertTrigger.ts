import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAlertSettings } from "@/lib/alertConditions";

interface RiskAlert {
  type: "high_risk" | "anomaly" | "red_flag";
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

interface UseRiskAlertTriggerResult {
  currentAlert: RiskAlert | null;
  dismissAlert: () => void;
  checkForAlerts: () => Promise<void>;
}

// Thresholds for triggering alerts
const RISK_THRESHOLDS = {
  acwr: { high: 1.5, critical: 1.8 },
  strain: { high: 2500, critical: 3500 },
  monotony: { high: 2.0, critical: 2.5 },
  hrv_drop: 20, // % drop from baseline
  readiness_low: 50,
  sleep_low: 60
};

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

// Session storage key for cooldown tracking
const ALERT_COOLDOWN_KEY = "risk_alert_shown";

export function useRiskAlertTrigger(): UseRiskAlertTriggerResult {
  const [currentAlert, setCurrentAlert] = useState<RiskAlert | null>(null);
  const smsSentRef = useRef<string | null>(null);

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

      if (recoveryTrends) {
        // Check ACWR
        if (recoveryTrends.acwr && recoveryTrends.acwr >= RISK_THRESHOLDS.acwr.critical) {
          alertToSet = {
            type: "high_risk",
            metric: "ACWR",
            value: recoveryTrends.acwr,
            threshold: RISK_THRESHOLDS.acwr.critical,
            message: "Your training load ratio is critically high. Consider reducing intensity to prevent injury."
          };
        }
        // Check strain
        else if (recoveryTrends.strain && recoveryTrends.strain >= RISK_THRESHOLDS.strain.critical) {
          alertToSet = {
            type: "high_risk",
            metric: "Strain",
            value: recoveryTrends.strain,
            threshold: RISK_THRESHOLDS.strain.critical,
            message: "Your accumulated training strain is very high. Recovery is recommended."
          };
        }
        // Check monotony
        else if (recoveryTrends.monotony && recoveryTrends.monotony >= RISK_THRESHOLDS.monotony.critical) {
          alertToSet = {
            type: "high_risk",
            metric: "Monotony",
            value: recoveryTrends.monotony,
            threshold: RISK_THRESHOLDS.monotony.critical,
            message: "Your training variation is very low. Consider diversifying your workouts."
          };
        }
      }

      // Check wearable session for low readiness/sleep
      if (!alertToSet) {
        const { data: session } = await supabase
          .from("wearable_sessions")
          .select("readiness_score, sleep_score, hrv_avg")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (session) {
          if (session.readiness_score && session.readiness_score < RISK_THRESHOLDS.readiness_low) {
            alertToSet = {
              type: "anomaly",
              metric: "Readiness",
              value: session.readiness_score,
              threshold: RISK_THRESHOLDS.readiness_low,
              message: "Your readiness score is unusually low. How are you feeling?"
            };
          } else if (session.sleep_score && session.sleep_score < RISK_THRESHOLDS.sleep_low) {
            alertToSet = {
              type: "anomaly",
              metric: "Sleep",
              value: session.sleep_score,
              threshold: RISK_THRESHOLDS.sleep_low,
              message: "Your sleep quality was poor. Consider logging any symptoms."
            };
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
        }
      }

      // Set the alert and send SMS if needed
      if (alertToSet) {
        const alertKey = `${alertToSet.metric}_${alertToSet.type}`;
        
        // Skip if this alert type was already shown this session (cooldown)
        if (shownSet.has(alertKey)) {
          return;
        }
        
        // Mark this alert as shown in session storage
        shownSet.add(alertKey);
        sessionStorage.setItem(ALERT_COOLDOWN_KEY, JSON.stringify([...shownSet]));
        
        setCurrentAlert(alertToSet);
        
        // Send SMS if enabled and not already sent for this alert
        if (smsSentRef.current !== alertKey) {
          const settings = getAlertSettings();
          if (settings.enableSMS && settings.phoneNumber) {
            smsSentRef.current = alertKey;
            await sendRiskAlertSMS(settings.phoneNumber, alertToSet.message);
          }
        }
      }

    } catch (error) {
      console.error("Error checking for risk alerts:", error);
    }
  }, []);

  const dismissAlert = useCallback(() => {
    setCurrentAlert(null);
  }, []);

  // Check on mount
  useEffect(() => {
    checkForAlerts();
  }, [checkForAlerts]);

  return {
    currentAlert,
    dismissAlert,
    checkForAlerts
  };
}
