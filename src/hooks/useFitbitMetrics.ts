import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ParsedFitbitMetrics } from "@/types/fitbit";
import { toast } from "@/hooks/use-toast";

interface FitbitAutoDataRow {
  id: number;
  user_id: string;
  activity: any;
  sleep?: any;
  fetched_at: string;
}

export const useFitbitMetrics = () => {
  const [metrics, setMetrics] = useState<ParsedFitbitMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const parseMetrics = useCallback((data: FitbitAutoDataRow): ParsedFitbitMetrics => {
    const activity = data.activity?.data;
    const sleep = data.sleep?.data?.sleep?.[0]; // Get main sleep
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
      setIsLoading(true);
      
      // Use type assertion to work with tables not in generated types
      const { data, error } = await (supabase as any)
        .from("fitbit_auto_data")
        .select("*")
        .eq("user_id", "CTBNRR")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
      toast({
        title: "Syncing Fitbit data...",
        description: "Please wait while we fetch your latest metrics",
      });

      const response = await fetch("/.netlify/functions/sync-auto");
      const result = await response.json();

      if (result.ok) {
        await fetchMetrics();
        toast({
          title: "Sync complete",
          description: "Your Fitbit data has been updated",
        });
      } else {
        throw new Error(result.error || "Sync failed");
      }
    } catch (error: any) {
      toast({
        title: "Sync failed",
        description: error.message || "Could not sync Fitbit data",
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
