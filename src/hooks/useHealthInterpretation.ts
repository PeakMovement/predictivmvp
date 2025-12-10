import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface HealthInterpretation {
  symptom_checkin_id: string;
  summary: string;
  flagged_conditions?: string[];
  recommendations?: string[];
  confidence_score: number;
  data_sources_used: string[];
  timestamp: string;
}

export const useHealthInterpretation = () => {
  const [interpretation, setInterpretation] = useState<HealthInterpretation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const interpretSymptom = useCallback(async (symptomCheckinId: string): Promise<HealthInterpretation | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("interpret-health-event", {
        body: { symptom_checkin_id: symptomCheckinId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setInterpretation(data);

      // Show toast for flagged conditions
      if (data.flagged_conditions?.length > 0) {
        toast({
          title: "Health Insight Available",
          description: `${data.flagged_conditions.length} potential concern(s) identified. Review the interpretation below.`,
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to interpret symptom";
      setError(message);
      toast({
        title: "Interpretation Error",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearInterpretation = useCallback(() => {
    setInterpretation(null);
    setError(null);
  }, []);

  return {
    interpretSymptom,
    interpretation,
    isLoading,
    error,
    clearInterpretation,
  };
};
