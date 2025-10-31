import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  total_calories: number | null;
  fetched_at: string | null;
}

export const useWearableSessions = (userId: string | undefined) => {
  const [data, setData] = useState<WearableSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchWearableSession = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data: sessionData, error: fetchError } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(1)
          .single();

        if (fetchError) throw fetchError;

        console.log("Wearable session data:", sessionData);
        setData(sessionData);
      } catch (err) {
        console.error("Error fetching wearable session:", err);
        setError(err instanceof Error ? err : new Error("Failed to fetch wearable session"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchWearableSession();
  }, [userId]);

  return { data, isLoading, error };
};
