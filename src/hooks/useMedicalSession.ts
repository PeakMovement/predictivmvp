import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MedicalSessionData {
  symptoms?: {
    primary: string;
    secondary?: string[];
  };
  preferences?: {
    location?: { city?: string; state?: string };
    insurance?: string[];
    telehealthPreferred?: boolean;
  };
  selectedPhysician?: {
    id: string;
    name: string;
    specialty: string;
  };
  treatmentPlanId?: string | null;
  analysis?: Record<string, unknown>;
  physicianMatches?: Record<string, unknown>[];
  treatmentPlan?: Record<string, unknown>;
}

export interface MedicalSession {
  id: string;
  userId: string;
  status: 'active' | 'completed' | 'abandoned';
  currentStep: string;
  data: MedicalSessionData;
  createdAt: string;
  lastUpdatedAt: string;
}

export interface SessionResponse {
  exists: boolean;
  session: MedicalSession | null;
}

export function useMedicalSession() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSession = useCallback(async (
    currentStep: string, 
    data: MedicalSessionData
  ): Promise<{ success: boolean; sessionId?: string }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'save-medical-session',
        { body: { currentStep, data } }
      );

      if (fnError) throw fnError;
      
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to save session');
      }

      console.log('[Session] Saved:', currentStep);
      return { success: true, sessionId: response.sessionId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save session';
      console.error('[Session] Save error:', message);
      setError(message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSession = useCallback(async (): Promise<SessionResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'get-medical-session'
      );

      if (fnError) throw fnError;

      console.log('[Session] Fetched:', response?.exists ? response.session?.currentStep : 'none');
      return {
        exists: response?.exists ?? false,
        session: response?.session ?? null
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get session';
      console.error('[Session] Get error:', message);
      setError(message);
      return { exists: false, session: null };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const completeSession = useCallback(async (
    bookingId?: string
  ): Promise<{ success: boolean }> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'complete-medical-session',
        { body: bookingId ? { bookingId } : {} }
      );

      if (fnError) throw fnError;

      console.log('[Session] Completed');
      return { success: response?.success ?? true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete session';
      console.error('[Session] Complete error:', message);
      setError(message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const abandonSession = useCallback(async (): Promise<{ success: boolean }> => {
    // For now, complete without booking to abandon
    // Could add dedicated abandon endpoint if needed
    setIsLoading(true);
    setError(null);

    try {
      const serviceClient = supabase;
      const { data: { user } } = await serviceClient.auth.getUser();
      
      if (!user) {
        return { success: true }; // No user = no session to abandon
      }

      // Mark current active session as abandoned by completing it
      const { data: response, error: fnError } = await supabase.functions.invoke(
        'complete-medical-session',
        { body: {} }
      );

      if (fnError) throw fnError;

      console.log('[Session] Abandoned');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to abandon session';
      console.error('[Session] Abandon error:', message);
      setError(message);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    saveSession,
    getSession,
    completeSession,
    abandonSession,
    isLoading,
    error
  };
}
