import { useEffect, useState } from "react";
import { useWearableMetrics } from "./useWearableMetrics";
import { getHealthData } from "@/lib/healthDataStore";

export const useUnifiedMetrics = () => {
  const { metrics, isLoading: metricsLoading, refresh } = useWearableMetrics();
  const [refreshKey, setRefreshKey] = useState(0);

  // Listen for wearable data refresh events
  useEffect(() => {
    const handleDataRefreshed = () => {
      console.log("[useUnifiedMetrics] Wearable data refreshed, reloading...");
      refresh();
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener("wearable_trends_refresh", handleDataRefreshed);
    return () => {
      window.removeEventListener("wearable_trends_refresh", handleDataRefreshed);
    };
  }, [refresh]);
  
  // Calculate sleep score from Fitbit data
  const calculateSleepScore = (efficiency: number, duration: number): number => {
    // Formula: efficiency (0-100) * 0.7 + capped duration score * 30
    const durationHours = duration / 60; // Convert minutes to hours
    const durationScore = Math.min(durationHours / 8, 1); // Cap at 8 hours
    return Math.round(efficiency * 0.7 + durationScore * 30);
  };

  // Get CSV data for fallback
  const csvData = getHealthData();
  const currentDayData = csvData.length > 0 ? csvData[csvData.length - 1] : null;

  // Unified sleep score
  const sleepScore = metrics?.hasSleepData
    ? calculateSleepScore(metrics.sleepEfficiency, metrics.sleepDuration)
    : (typeof currentDayData?.SleepScore === 'number' ? currentDayData.SleepScore : null);

  // Other metrics follow same priority - use nullish coalescing to avoid property errors
  const steps = metrics?.steps || null;
  const heartRate = metrics?.averageHeartRate || null;
  const caloriesOut = metrics?.caloriesOut || null;
  
  return {
    sleepScore,
    steps,
    heartRate,
    caloriesOut,
    metrics, // Pass through all wearable metrics
    dataSource: metrics ? 'wearable' : currentDayData ? 'csv' : null,
    isLoading: metricsLoading
  };
};

