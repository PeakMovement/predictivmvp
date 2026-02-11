import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParsedFitbitMetrics } from "@/types/fitbit";
import { toast } from "@/hooks/use-toast";

// Interface matching the actual wearable_sessions DB schema
interface WearableSessionRow {
  id: string;
  user_id: string;
  date: string;
  source: string;
  readiness_score: number | null;
  sleep_score: number | null;
  activity_score: number | null;
  total_steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  resting_hr: number | null;
  hrv_avg: number | null;
  spo2_avg: number | null;
  fetched_at: string | null;
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
    const heartRateZones: ParsedFitbitMetrics['heartRateZones'] = restingHR > 0 ? [
      {
        name: "Out of Range" as const,
        min: 30,
        max: Math.round(restingHR * 0.5),
        minutes: sedentaryMinutes,
        caloriesOut: Math.round(sedentaryMinutes * 1.2),
      },
      {
        name: "Fat Burn" as const,
        min: Math.round(restingHR * 0.5),
        max: Math.round(restingHR * 0.7),
        minutes: lightlyActiveMinutes,
        caloriesOut: Math.round(lightlyActiveMinutes * 3.5),
      },
      {
        name: "Cardio" as const,
        min: Math.round(restingHR * 0.7),
        max: Math.round(restingHR * 0.85),
        minutes: fairlyActiveMinutes,
        caloriesOut: Math.round(fairlyActiveMinutes * 6),
      },
      {
        name: "Peak" as const,
        min: Math.round(restingHR * 0.85),
        max: 220 - 30,
        minutes: veryActiveMinutes,
        caloriesOut: Math.round(veryActiveMinutes * 10),
      },
    ] : [];

    // Estimate sleep duration from sleep score (we don't have actual duration in DB)
    const estimatedSleepMinutes = data.sleep_score ? Math.round((data.sleep_score / 100) * 480) : 0;
    const deepSleepMinutes = Math.round(estimatedSleepMinutes * 0.2);
    const lightSleepMinutes = Math.round(estimatedSleepMinutes * 0.5);
    const remSleepMinutes = Math.round(estimatedSleepMinutes * 0.25);
    const awakeSleepMinutes = Math.round(estimatedSleepMinutes * 0.05);

    const sleepEfficiency = data.sleep_score || 0;

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

      sleepDuration: estimatedSleepMinutes,
      sleepEfficiency,
      sleepStartTime: "",
      sleepEndTime: "",
      deepSleepMinutes,
      lightSleepMinutes,
      remSleepMinutes,
      awakeSleepMinutes,

      lastSync: data.fetched_at || '',
      hasSleepData: estimatedSleepMinutes > 0,
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
        .in("source", ["oura", "garmin"])
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
        const parsed = parseOuraMetrics(data as WearableSessionRow);
        setMetrics(parsed);
        setLastSync(data.fetched_at);
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
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    const setupSubscription = async () => {
      // Get current user for filtered subscription
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        channel = supabase
          .channel("wearable_sessions_user_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wearable_sessions",
              filter: `user_id=eq.${user.id}`, // CRITICAL: Filter by user_id to prevent cross-user data leakage
            },
            (payload) => {
              console.log("🔔 Wearable session updated for current user:", payload);
              fetchMetrics();
            }
          )
          .subscribe();
      }
    };
    
    fetchMetrics();
    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    lastSync,
    refresh,
  };
};
