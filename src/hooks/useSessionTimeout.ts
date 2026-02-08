import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SessionTimeoutConfig {
  timeoutMs: number;
  warningMs: number;
  onWarning: () => void;
  onTimeout: () => void;
}

const DEFAULT_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_WARNING = 5 * 60 * 1000; // 5 minutes before timeout

export function useSessionTimeout(config?: Partial<SessionTimeoutConfig>) {
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeUntilTimeout, setTimeUntilTimeout] = useState<number | null>(null);

  const timeoutMs = config?.timeoutMs || DEFAULT_TIMEOUT;
  const warningMs = config?.warningMs || DEFAULT_WARNING;

  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
  }, []);

  const extendSession = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('Failed to refresh session:', error);
        return false;
      }

      if (data.session) {
        updateActivity();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error extending session:', error);
      return false;
    }
  }, [updateActivity]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();

      const userSpecificKeys = [
        'todays-decision-cache',
        'insightHistory',
        'wearable_connected',
        'wearable_last_sync',
        'layout_customization',
        'alert-settings',
      ];
      userSpecificKeys.forEach(key => localStorage.removeItem(key));

      const sessionKeys = [
        'activeClientProfile',
        'clientProfiles',
        'findHelpQuery',
        'wearable_code_verifier',
        'wearable_user_id',
      ];
      sessionKeys.forEach(key => sessionStorage.removeItem(key));

      config?.onTimeout?.();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }, [config]);

  useEffect(() => {
    const checkTimeout = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const remaining = timeoutMs - timeSinceActivity;

      setTimeUntilTimeout(Math.max(0, remaining));

      if (remaining <= 0) {
        logout();
      } else if (remaining <= warningMs && !showWarning) {
        setShowWarning(true);
        config?.onWarning?.();
      }
    };

    const interval = setInterval(checkTimeout, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, timeoutMs, warningMs, showWarning, logout, config]);

  useEffect(() => {
    const events = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          updateActivity();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [updateActivity]);

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);

    if (minutes > 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
  };

  return {
    showWarning,
    timeUntilTimeout,
    timeRemaining: timeUntilTimeout ? formatTimeRemaining(timeUntilTimeout) : null,
    extendSession,
    dismissWarning: () => setShowWarning(false),
    logout,
  };
}
