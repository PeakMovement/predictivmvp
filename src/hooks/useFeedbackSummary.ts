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
        // Get current user for user-scoped data
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Query feedback directly with user filter instead of summary view
        const { data, error } = await supabase
          .from("feedback")
          .select("metric, feedback_score")
          .eq("user_id", user.id);
          
        if (error) {
          setError(error.message);
        } else if (data) {
          // Aggregate feedback by metric
          const aggregated: Record<string, { total: number; count: number }> = {};
          data.forEach((row) => {
            if (!aggregated[row.metric]) {
              aggregated[row.metric] = { total: 0, count: 0 };
            }
            if (row.feedback_score !== null) {
              aggregated[row.metric].total += row.feedback_score;
              aggregated[row.metric].count += 1;
            }
          });
          
          const summaryData: FeedbackSummary[] = Object.entries(aggregated).map(([metric, stats]) => ({
            metric,
            avg_score: stats.count > 0 ? stats.total / stats.count : 0,
            total_feedback: stats.count,
          }));
          
          setSummary(summaryData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();

    // Subscribe to realtime feedback changes for current user
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      return supabase
        .channel("feedback-summary-changes")
        .on(
          "postgres_changes",
          { 
            event: "*", 
            schema: "public", 
            table: "feedback",
            filter: `user_id=eq.${user.id}`
          },
          () => fetchSummary()
        )
        .subscribe();
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    setupSubscription().then(ch => { channel = ch; });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { summary, loading, error };
};
