import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Interface matching the actual wearable_sessions DB schema
interface WearableSession {
  id: string;
  user_id: string;
  date: string;
  source: string;
  readiness_score: number | null;
  sleep_score: number | null;
  activity_score: number | null;
  hrv_avg: number | null;
  resting_hr: number | null;
  spo2_avg: number | null;
  total_steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  fetched_at: string | null;
}

export const useWearableSessions = (userId: string | undefined, source?: string) => {
  const [data, setData] = useState<WearableSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => {
    setRefetchTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const fetchWearableSession = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        let query = supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", userId)
          .not("total_calories", "is", null)
          .order("date", { ascending: false })
          .limit(1);

        // Filter by source when specified
        if (source && source !== "auto") {
          query = query.eq("source", source);
        }

        const { data: sessionData, error: fetchError } = await query.maybeSingle();

        if (fetchError) throw fetchError;

        console.log("Wearable session data:", sessionData);
        setData(sessionData as WearableSession);
      } catch (err) {
        console.error("Error fetching wearable session:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch wearable session"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchWearableSession();

    if (!userId) return;

    const channel = supabase
      .channel(`wearable_sessions_changes_${source ?? "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wearable_sessions",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("🔴 Live update detected - refetching wearable session");
          fetchWearableSession();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, source, refetchTrigger]);

  return { data, isLoading, error, refetch };
};
