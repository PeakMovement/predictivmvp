import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { FocusMode } from "./useDashboardFocusMode";

export interface YvesDailyBriefing {
  summary: string;
  keyChanges: string[];
  riskHighlights: string[];
  todaysFocus?: string;
}

export interface YvesRecommendation {
  text: string;
  category: 'training' | 'recovery' | 'nutrition' | 'medical' | 'sleep' | 'activity';
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface YvesIntelligence {
  dailyBriefing: YvesDailyBriefing;
  recommendations: YvesRecommendation[];
}

interface IntelligenceState {
  data: YvesIntelligence | null;
  content: string | null;
  createdAt: string | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  cached: boolean;
  focusMode?: FocusMode;
  previousFocusMode?: FocusMode;
}

export function useYvesIntelligence(focusMode?: FocusMode) {
  const [state, setState] = useState<IntelligenceState>({
    data: null,
    content: null,
    createdAt: null,
    isLoading: true,
    isGenerating: false,
    error: null,
    cached: false,
  });
  const { toast } = useToast();

  const fetchIntelligence = useCallback(async (forceRefresh = false, currentFocusMode?: FocusMode) => {
    try {
      setState(prev => ({ 
        ...prev, 
        isLoading: !forceRefresh, 
        isGenerating: forceRefresh,
        error: null 
      }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setState(prev => ({ ...prev, isLoading: false, isGenerating: false }));
        return;
      }

      const activeFocusMode = currentFocusMode || focusMode;

      // If not force refresh, try to get cached data first (only if same focus mode)
      if (!forceRefresh && activeFocusMode) {
        const today = new Date().toISOString().split("T")[0];
        const { data: cachedData } = await supabase
          .from("daily_briefings")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("category", "unified")
          .eq("focus_mode", activeFocusMode)
          .maybeSingle();

        if (cachedData?.context_used) {
          const intelligenceData = cachedData.context_used as unknown as YvesIntelligence;
          setState({
            data: intelligenceData,
            content: cachedData.content,
            createdAt: cachedData.created_at,
            isLoading: false,
            isGenerating: false,
            error: null,
            cached: true,
            focusMode: activeFocusMode,
          });
          return;
        }
      }

      // Call edge function to generate fresh intelligence
      const { data, error } = await supabase.functions.invoke("generate-yves-intelligence", {
        body: {
          user_id: user.id,
          focus_mode: activeFocusMode,
          force_refresh: forceRefresh,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setState({
          data: data.data as YvesIntelligence,
          content: data.content,
          createdAt: data.created_at,
          isLoading: false,
          isGenerating: false,
          error: null,
          cached: data.cached || false,
          focusMode: activeFocusMode,
        });

        if (forceRefresh && !data.cached) {
          toast({
            title: "Intelligence refreshed",
            description: "Your daily briefing and recommendations are updated",
          });
        }
      } else {
        throw new Error(data?.error || "Failed to generate intelligence");
      }
    } catch (error) {
      console.error("Error fetching Yves intelligence:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isGenerating: false,
        error: errorMessage,
      }));

      if (errorMessage.includes("Rate limit")) {
        toast({
          title: "Rate limit reached",
          description: "Please wait a moment before trying again",
          variant: "destructive",
        });
      }
    }
  }, [toast, focusMode]);

  const refresh = useCallback((newFocusMode?: FocusMode) => {
    fetchIntelligence(true, newFocusMode);
  }, [fetchIntelligence]);

  useEffect(() => {
    const shouldForceRefresh = state.previousFocusMode && state.previousFocusMode !== focusMode;

    if (shouldForceRefresh) {
      console.log(`[useYvesIntelligence] Focus mode changed from ${state.previousFocusMode} to ${focusMode}, forcing refresh`);
    }

    fetchIntelligence(shouldForceRefresh || false, focusMode);

    setState(prev => ({ ...prev, previousFocusMode: focusMode }));
  }, [fetchIntelligence, focusMode]);

  return {
    ...state,
    refresh,
    dailyBriefing: state.data?.dailyBriefing || null,
    recommendations: state.data?.recommendations || [],
  };
}
