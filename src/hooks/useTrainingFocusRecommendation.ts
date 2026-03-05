import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TrainingFocusRec {
  id: string;
  category: string;
  priority: string | null;
  recommendation_text: string;
  internal_reasoning: string | null;
  data_sources: string[] | null;
  confidence: number | null;
  created_at: string;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function useTrainingFocusRecommendation() {
  const [rec, setRec] = useState<TrainingFocusRec | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRec = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const since = new Date();
      since.setHours(since.getHours() - 24);

      const { data } = await supabase
        .from("yves_recommendations")
        .select("id, category, priority, recommendation_text, internal_reasoning, data_sources, confidence, created_at")
        .eq("user_id", user.id)
        .in("category", ["training", "recovery"])
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(10);

      if (data && data.length > 0) {
        const sorted = [...data].sort((a, b) => {
          const pa = PRIORITY_ORDER[a.priority ?? "low"] ?? 2;
          const pb = PRIORITY_ORDER[b.priority ?? "low"] ?? 2;
          return pa - pb;
        });
        setRec(sorted[0] as TrainingFocusRec);
      } else {
        setRec(null);
      }
    } catch (error) {
      console.error("Error fetching training focus recommendation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRec();
  }, []);

  return { rec, isLoading, refresh: fetchRec };
}
