import { HealthDataRow } from "./healthDataStore";
import { supabase } from "@/integrations/supabase/client";

export interface AlertSettings {
  enableSMS: boolean;
  phoneNumber: string;
}

export interface AlertCondition {
  type: 'acwr_high' | 'hrv_low' | 'sleep_poor' | 'weekly_report';
  message: string;
  color: 'red' | 'orange' | 'blue';
}

const SPAM_PREVENTION_HOURS = 12;

// Get alert settings from localStorage
export const getAlertSettings = (): AlertSettings => {
  const stored = localStorage.getItem('alert-settings');
  if (stored) {
    return JSON.parse(stored);
  }
  return { enableSMS: false, phoneNumber: '' };
};

// Save alert settings to localStorage
export const saveAlertSettings = (settings: AlertSettings) => {
  localStorage.setItem('alert-settings', JSON.stringify(settings));
};

// Check if we've sent this alert type recently (spam prevention)
const canSendAlert = async (alertType: string): Promise<boolean> => {
  try {
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - SPAM_PREVENTION_HOURS);

    const { data, error } = await supabase
      .from('notification_log')
      .select('created_at, message')
      .gte('created_at', hoursAgo.toISOString())
      .ilike('message', `%${alertType}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error checking notification log:', error);
      return true; // Allow sending if check fails
    }

    // No recent alerts of this type
    return !data || data.length === 0;
  } catch (error) {
    console.error('Error in canSendAlert:', error);
    return true; // Allow sending if check fails
  }
};

// Evaluate metrics and determine which alerts should fire
export const evaluateAlertConditions = (dayData: HealthDataRow): AlertCondition[] => {
  const alerts: AlertCondition[] = [];

  // Check ACWR > 1.5
  if (dayData.ACWR && parseFloat(dayData.ACWR) > 1.5) {
    alerts.push({
      type: 'acwr_high',
      message: '⚠️ High training load — plan active recovery today.',
      color: 'red',
    });
  }

  // Check HRV < 65
  if (dayData.HRV && parseFloat(dayData.HRV) < 65) {
    alerts.push({
      type: 'hrv_low',
      message: '🧘 Recovery low — take it light today.',
      color: 'orange',
    });
  }

  // Check SleepScore < 70
  if (dayData.SleepScore && parseFloat(dayData.SleepScore) < 70) {
    alerts.push({
      type: 'sleep_poor',
      message: '😴 Sleep quality dropped — focus on rest.',
      color: 'orange',
    });
  }

  return alerts;
};

// Send SMS alert via edge function with retry logic
const sendSMSWithRetry = async (
  to: string,
  message: string,
  retryCount = 0
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('send-sms-alert', {
      body: { to, message },
    });

    if (error) {
      console.error('Error sending SMS:', error);
      
      // Retry once after 5 seconds if first attempt fails
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return sendSMSWithRetry(to, message, retryCount + 1);
      }
      
      return false;
    }

    return data?.success === true;
  } catch (error) {
    console.error('Error invoking send-sms-alert:', error);
    
    // Retry once if first attempt throws exception
    if (retryCount === 0) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      return sendSMSWithRetry(to, message, retryCount + 1);
    }
    
    return false;
  }
};

// Check for failed alerts in last 24 hours
const checkFailureRate = async (): Promise<boolean> => {
  try {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    const { data, error } = await supabase
      .from('notification_log')
      .select('status')
      .gte('created_at', yesterday.toISOString())
      .eq('status', 'failed');

    if (error) {
      console.error('Error checking failure rate:', error);
      return true; // Allow sending if check fails
    }

    // If 3 or more failures in 24h, pause alerts
    if (data && data.length >= 3) {
      console.warn('Alert system paused: 3+ failures in 24 hours');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in checkFailureRate:', error);
    return true;
  }
};

// Main function to check conditions and send alerts
export const checkAlertConditions = async (dayData: HealthDataRow): Promise<void> => {
  const settings = getAlertSettings();

  // Check if SMS is enabled and phone number is configured
  if (!settings.enableSMS || !settings.phoneNumber) {
    return;
  }

  // Check if we've had too many failures recently
  const canSend = await checkFailureRate();
  if (!canSend) {
    console.warn('Alert system paused due to high failure rate');
    return;
  }

  // Evaluate conditions
  const alerts = evaluateAlertConditions(dayData);

  // Send each alert if spam prevention allows
  for (const alert of alerts) {
    const canSendThisAlert = await canSendAlert(alert.type);
    
    if (canSendThisAlert) {
      const success = await sendSMSWithRetry(settings.phoneNumber, alert.message);
      
      if (success) {
      } else {
        console.error(`✗ Failed to send alert: ${alert.type}`);
      }
    } else {
    }
  }
};

// Send weekly report alert
export const sendWeeklyReportAlert = async (): Promise<void> => {
  const settings = getAlertSettings();

  if (!settings.enableSMS || !settings.phoneNumber) {
    return;
  }

  const canSend = await checkFailureRate();
  if (!canSend) {
    return;
  }

  const canSendReport = await canSendAlert('weekly_report');
  if (!canSendReport) {
    return;
  }

  const message = '📊 Your new Predictiv weekly insights are ready.';
  const success = await sendSMSWithRetry(settings.phoneNumber, message);
  
  if (success) {
  } else {
    console.error('✗ Failed to send weekly report alert');
  }
};
