import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TriageInput = {
  issue_type: string;
  severity?: string;
  contextual_factors?: Record<string, any>;
};

export const useTriagePrediction = () => {
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const predictProvider = useCallback(async (input: TriageInput): Promise<any> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You must be logged in to use triage");
      }

      const { data, error: fnError } = await supabase.functions.invoke("predict-provider", {
        body: input,
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to generate prediction");
      }

      setPrediction(data);

      if (data.urgency === "emergency") {
        toast({
          title: "Emergency Detected",
          description: "Please seek immediate medical attention.",
          variant: "destructive",
        });
      } else if (data.urgency === "urgent") {
        toast({
          title: "Urgent Care Recommended",
          description: `We recommend seeing a ${data.recommended_provider.name} soon.`,
          variant: "default",
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to predict provider";
      setError(message);
      toast({
        title: "Triage Error",
        description: message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    predictProvider,
    prediction,
    isLoading,
    error,
  };
};
