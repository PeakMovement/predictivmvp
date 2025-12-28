import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface YvesDailyBriefing {
  summary: string;
  keyChanges: string[];
  riskHighlights: string[];
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
}

export function useYvesIntelligence() {
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

  const fetchIntelligence = useCallback(async (forceRefresh = false) => {
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

      // If not force refresh, try to get cached data first
      if (!forceRefresh) {
        const today = new Date().toISOString().split("T")[0];
        const { data: cachedData } = await supabase
          .from("daily_briefings")
          .select("*")
          .eq("user_id", user.id)
          .eq("date", today)
          .eq("category", "unified")
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
          });
          return;
        }
      }

      // Call edge function to generate fresh intelligence
      const { data, error } = await supabase.functions.invoke("generate-yves-intelligence", {
        body: { user_id: user.id },
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
  }, [toast]);

  const refresh = useCallback(() => {
    fetchIntelligence(true);
  }, [fetchIntelligence]);

  useEffect(() => {
    fetchIntelligence(false);
  }, [fetchIntelligence]);

  return {
    ...state,
    refresh,
    dailyBriefing: state.data?.dailyBriefing || null,
    recommendations: state.data?.recommendations || [],
  };
}
