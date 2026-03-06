import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProfessionalType =
  | "physiotherapist"
  | "biokineticist"
  | "sports_doctor"
  | "general_practitioner"
  | "dietician"
  | "strength_coach"
  | "run_coach";

export interface ParsedIntent {
  professionalTypes: ProfessionalType[];
  severity: number;
  redFlags: boolean;
  urgency: "routine" | "soon" | "urgent" | "emergency";
  budget: number | null;
  location: string | null;
  summary: string;
}

export function useMatchProvider() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);

  const matchProvider = async (query: string): Promise<ParsedIntent | null> => {
    setIsLoading(true);
    setError(null);
    setParsed(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not authenticated");

      const url = `https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/match-provider`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.parsed) {
        throw new Error("Invalid response from server");
      }

      setParsed(data.parsed);
      return data.parsed;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { matchProvider, parsed, isLoading, error };
}
