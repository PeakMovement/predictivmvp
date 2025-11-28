import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParsedFitbitMetrics } from "@/types/fitbit";
import { toast } from "@/hooks/use-toast";

interface WearableSessionRow {
  id: number;
  user_id: string;
  date: string;
  source: string;
  readiness_score: number | null;
  sleep_score: number | null;
  activity_score: number | null;
  total_steps: number | null;
  active_calories: number | null;
  resting_hr: number | null;
  hrv: number | null;
  spo2_avg: number | null;
  sleep_duration_hours: number | null;
  deep_sleep_hours: number | null;
  rem_sleep_hours: number | null;
  light_sleep_hours: number | null;
  created_at: string;
}

export const useWearableMetrics = () => {
  const [metrics, setMetrics] = useState<ParsedFitbitMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const parseOuraMetrics = useCallback((data: WearableSessionRow): ParsedFitbitMetrics => {
    const steps = data.total_steps || 0;
    const distanceKm = steps * 0.000762;

    const activityScore = data.activity_score || 0;
    const estimatedActiveMinutes = Math.round((activityScore / 100) * 120);
    const veryActiveMinutes = Math.round(estimatedActiveMinutes * 0.4);
    const fairlyActiveMinutes = Math.round(estimatedActiveMinutes * 0.6);

    const sedentaryMinutes = Math.max(0, 1440 - estimatedActiveMinutes - 480);
    const lightlyActiveMinutes = Math.max(0, 480 - estimatedActiveMinutes);

    const restingHR = data.resting_hr || 0;
    const heartRateZones = restingHR > 0 ? [
      {
        name: "Out of Range",
        min: 30,
        max: Math.round(restingHR * 0.5),
        minutes: sedentaryMinutes,
        caloriesOut: Math.round(sedentaryMinutes * 1.2),
      },
      {
        name: "Fat Burn",
        min: Math.round(restingHR * 0.5),
        max: Math.round(restingHR * 0.7),
        minutes: lightlyActiveMinutes,
        caloriesOut: Math.round(lightlyActiveMinutes * 3.5),
      },
      {
        name: "Cardio",
        min: Math.round(restingHR * 0.7),
        max: Math.round(restingHR * 0.85),
        minutes: fairlyActiveMinutes,
        caloriesOut: Math.round(fairlyActiveMinutes * 6),
      },
      {
        name: "Peak",
        min: Math.round(restingHR * 0.85),
        max: 220 - 30,
        minutes: veryActiveMinutes,
        caloriesOut: Math.round(veryActiveMinutes * 10),
      },
    ] : [];

    const sleepDurationMinutes = (data.sleep_duration_hours || 0) * 60;
    const deepSleepMinutes = (data.deep_sleep_hours || 0) * 60;
    const lightSleepMinutes = (data.light_sleep_hours || 0) * 60;
    const remSleepMinutes = (data.rem_sleep_hours || 0) * 60;
    const awakeSleepMinutes = Math.max(0, sleepDurationMinutes - deepSleepMinutes - lightSleepMinutes - remSleepMinutes);

    const sleepEfficiency = sleepDurationMinutes > 0 && data.sleep_score
      ? Math.round((data.sleep_score / 100) * 100)
      : 0;

    return {
      steps: steps,
      distance: distanceKm,
      floors: 0,
      elevation: 0,
      caloriesOut: (data.active_calories || 0) + Math.round(sedentaryMinutes * 1.2),
      activityCalories: data.active_calories || 0,
      sedentaryMinutes,
      lightlyActiveMinutes,
      fairlyActiveMinutes,
      veryActiveMinutes,

      restingHeartRate: restingHR,
      heartRateZones,
      averageHeartRate: restingHR > 0 ? Math.round(restingHR * 1.2) : 0,

      sleepDuration: sleepDurationMinutes,
      sleepEfficiency,
      sleepStartTime: "",
      sleepEndTime: "",
      deepSleepMinutes,
      lightSleepMinutes,
      remSleepMinutes,
      awakeSleepMinutes,

      lastSync: data.created_at,
      hasSleepData: sleepDurationMinutes > 0,
    };
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        console.log("No user logged in");
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("source", "oura")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching wearable metrics:", error);
        setIsLoading(false);
        return;
      }

      if (data) {
        console.log("✅ Oura data loaded from wearable_sessions:", data);
        const parsed = parseOuraMetrics(data);
        setMetrics(parsed);
        setLastSync(data.created_at);
      } else {
        console.log("No Oura data found in wearable_sessions");
        setMetrics(null);
      }
    } catch (error) {
      console.error("Error in fetchMetrics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [parseOuraMetrics]);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw new Error("Not authenticated");
      }

      console.log("🔄 Triggering Oura sync...");

      const { data, error } = await supabase.functions.invoke('fetch-oura-data', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error("Oura sync error:", error);
        throw new Error(error.message);
      }

      console.log("✅ Oura sync response:", data);

      await new Promise(resolve => setTimeout(resolve, 2000));
      await fetchMetrics();

      toast({
        title: "Data Refreshed",
        description: "Ōura Ring data has been updated successfully",
      });
    } catch (error) {
      console.error('Failed to refresh Oura data:', error);
      toast({
        title: "Refresh Failed",
        description: error instanceof Error ? error.message : "Could not refresh data. Please try again.",
        variant: "destructive",
      });
    }
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();

    const channel = supabase
      .channel("wearable_sessions_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wearable_sessions",
        },
        (payload) => {
          console.log("🔔 Wearable session updated:", payload);
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    lastSync,
    refresh,
  };
};
