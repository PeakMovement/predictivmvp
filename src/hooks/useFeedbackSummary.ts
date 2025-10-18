import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackSummary {
  metric: string;
  avg_score: number;
  total_feedback: number;
}

/**
 * Fetches and subscribes to feedback summary data.
 * Automatically updates when new feedback is recorded.
 */
export const useFeedbackSummary = () => {
  const [summary, setSummary] = useState<FeedbackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data, error } = await (supabase.from as any)("feedback_summary").select("*");
        if (error) {
          setError(error.message);
        } else if (data) {
          setSummary((data as FeedbackSummary[]) || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    // Subscribe to realtime feedback changes
    const channel = supabase
      .channel("feedback-summary-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "feedback" },
        () => fetchSummary()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { summary, loading, error };
};
