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
  total_distance_km: number | null;
  running_distance_km: number | null;
  duration_minutes: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  training_load: number | null;
  session_type: string | null;
  // Garmin-specific
  body_battery_start: number | null;
  body_battery_end: number | null;
  body_battery_min: number | null;
  body_battery_max: number | null;
  stress_avg: number | null;
  stress_max: number | null;
  vo2_max: number | null;
  training_status: string | null;
  respiration_rate_avg: number | null;
  intensity_minutes_moderate: number | null;
  intensity_minutes_vigorous: number | null;
  fetched_at: string | null;
  // Sleep stage columns (minutes)
  total_sleep_duration: number | null;
  deep_sleep_duration: number | null;
  rem_sleep_duration: number | null;
  light_sleep_duration: number | null;
  sleep_efficiency: number | null;
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

        // Explicit column list — keeps query stable as schema evolves and
        // ensures all Garmin-specific columns added in migration
        // 20260307000007 are fetched alongside core columns.
        const COLUMNS = [
          "id", "user_id", "date", "source", "fetched_at",
          // Core health metrics
          "readiness_score", "sleep_score", "activity_score",
          "hrv_avg", "resting_hr", "spo2_avg",
          "total_steps", "active_calories", "total_calories",
          "total_distance_km", "running_distance_km",
          // Garmin-specific (migration 20260307000007)
          "body_battery_start", "body_battery_end",
          "body_battery_min", "body_battery_max",
          "stress_avg", "stress_max",
          "vo2_max", "training_status",
          "respiration_rate_avg",
          "intensity_minutes_moderate", "intensity_minutes_vigorous",
          "session_type",
          "avg_heart_rate", "max_heart_rate",
          "duration_minutes", "training_load",
          // Sleep stage columns (migration 20260208114830)
          "total_sleep_duration", "deep_sleep_duration",
          "rem_sleep_duration", "light_sleep_duration", "sleep_efficiency",
        ].join(",");

        let query = supabase
          .from("wearable_sessions")
          .select(COLUMNS)
          .eq("user_id", userId)
          .order("date", { ascending: false })
          .limit(1);

        // Filter by source when specified
        if (source && source !== "auto") {
          query = query.eq("source", source);
        }

        const { data: sessionData, error: fetchError } = await query.maybeSingle();

        if (fetchError) throw fetchError;

        setData(sessionData as unknown as WearableSession);
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
