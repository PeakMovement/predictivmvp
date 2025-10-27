import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParsedFitbitMetrics } from "@/types/fitbit";
import { toast } from "@/hooks/use-toast";

interface FitbitAutoDataRow {
  id: number;
  user_id: string;
  activity_data: any;
  sleep_data?: any;
  fetched_at: string;
}

export const useFitbitMetrics = () => {
  const [metrics, setMetrics] = useState<ParsedFitbitMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const parseMetrics = useCallback((data: FitbitAutoDataRow): ParsedFitbitMetrics => {
    const activity = data.activity_data?.data;
    const sleep = data.sleep_data?.data?.sleep?.[0]; // Get main sleep
    const summary = activity?.summary;

    // Calculate average heart rate from zones
    let totalMinutes = 0;
    let weightedHR = 0;
    
    if (summary?.heartRateZones) {
      summary.heartRateZones.forEach((zone: any) => {
        const avgZoneHR = (zone.min + zone.max) / 2;
        totalMinutes += zone.minutes;
        weightedHR += avgZoneHR * zone.minutes;
      });
    }
    
    const averageHeartRate = totalMinutes > 0 ? Math.round(weightedHR / totalMinutes) : 0;

    return {
      // Activity metrics
      steps: summary?.steps || 0,
      distance: summary?.distances?.[0]?.distance || 0,
      floors: summary?.floors || 0,
      elevation: summary?.elevation || 0,
      caloriesOut: summary?.caloriesOut || 0,
      activityCalories: summary?.activityCalories || 0,
      sedentaryMinutes: summary?.sedentaryMinutes || 0,
      lightlyActiveMinutes: summary?.lightlyActiveMinutes || 0,
      fairlyActiveMinutes: summary?.fairlyActiveMinutes || 0,
      veryActiveMinutes: summary?.veryActiveMinutes || 0,
      
      // Heart rate metrics
      restingHeartRate: summary?.restingHeartRate || 0,
      heartRateZones: summary?.heartRateZones || [],
      averageHeartRate,
      
      // Sleep metrics
      sleepDuration: sleep?.minutesAsleep || 0,
      sleepEfficiency: sleep?.efficiency || 0,
      sleepStartTime: sleep?.startTime || "",
      sleepEndTime: sleep?.endTime || "",
      deepSleepMinutes: sleep?.levels?.summary?.deep?.minutes || 0,
      lightSleepMinutes: sleep?.levels?.summary?.light?.minutes || 0,
      remSleepMinutes: sleep?.levels?.summary?.rem?.minutes || 0,
      awakeSleepMinutes: sleep?.levels?.summary?.wake?.minutes || 0,
      
      // Metadata
      lastSync: data.fetched_at,
      hasSleepData: !!sleep,
    };
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const query = supabase
        .from("fitbit_auto_data")
        .select("*")
        .order("fetched_at", { ascending: false })
        .limit(1);

      // If we have a user, filter by user_id, otherwise get the most recent data
      if (user?.id) {
        query.eq("user_id", user.id);
      } else {
        // Fallback: get most recent non-null user_id data
        query.not("user_id", "is", null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Error fetching Fitbit metrics:", error);
        return;
      }

      if (data) {
        const parsed = parseMetrics(data);
        setMetrics(parsed);
        setLastSync(data.fetched_at);
      }
    } catch (error) {
      console.error("Error in fetchMetrics:", error);
    } finally {
      setIsLoading(false);
    }
  }, [parseMetrics]);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const body = user?.id ? { user_id: user.id } : {};
      const { error } = await supabase.functions.invoke('fetch-fitbit-auto', { body });
      
      if (error) throw new Error(error.message);

      // Wait a moment for DB to update, then fetch new metrics
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchMetrics();

      toast({
        title: "Data Refreshed",
        description: "Fitbit data has been updated successfully",
      });
    } catch (error) {
      console.error('Failed to refresh Fitbit data:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh Fitbit data. Please try again.",
        variant: "destructive",
      });
    }
  }, [fetchMetrics]);

  useEffect(() => {
    fetchMetrics();

    // Set up real-time subscription
    const channel = (supabase as any)
      .channel("fitbit_auto_data_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fitbit_auto_data",
        },
        () => {
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
