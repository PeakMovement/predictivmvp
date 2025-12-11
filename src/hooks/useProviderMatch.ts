import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProviderMatch {
  providerKey: string;
  name: string;
  specialty: string;
  budgetRange: { min: number; max: number };
  urgencyLevel: string;
  description: string;
  budgetScore: number;
  locationScore: number;
  urgencyScore: number;
  overallScore: number;
  withinBudget: boolean;
  estimatedCost: string;
}

export interface MatchResult {
  success: boolean;
  topMatch: ProviderMatch | null;
  alternatives: ProviderMatch[];
  searchCriteria: {
    symptom_type: string;
    budget_max: number;
    location: string;
    urgency: string;
  };
}

export interface MatchInput {
  symptom_type: string;
  budget_max?: number;
  location?: string;
  urgency?: string;
}

export function useProviderMatch() {
  const [result, setResult] = useState<MatchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const findProvider = async (input: MatchInput): Promise<MatchResult | null> => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('match-provider', {
        body: input
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to find provider match');
      }

      setResult(data);
      
      if (data.topMatch) {
        toast({
          title: "Match Found",
          description: `Best match: ${data.topMatch.name} (${data.topMatch.overallScore}% match)`,
        });
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to find provider';
      setError(message);
      toast({
        title: "Matching Error",
        description: message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
  };

  return {
    findProvider,
    result,
    isLoading,
    error,
    reset
  };
}
