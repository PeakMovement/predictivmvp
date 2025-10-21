import { useMemo, useEffect, useState } from "react";
import { useFitbitMetrics } from "./useFitbitMetrics";
import { useLiveData } from "@/contexts/LiveDataContext";

export const useUnifiedMetrics = () => {
  const { metrics, isLoading: fitbitLoading, refresh } = useFitbitMetrics();
  const { currentDayData } = useLiveData();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Listen for Fitbit data refresh events
  useEffect(() => {
    const handleDataRefreshed = () => {
      console.log("[useUnifiedMetrics] Fitbit data refreshed, reloading...");
      refresh();
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener("fitbit_trends_refresh", handleDataRefreshed);
    return () => window.removeEventListener("fitbit_trends_refresh", handleDataRefreshed);
  }, [refresh]);
  
  // Calculate sleep score from Fitbit data
  const calculateSleepScore = (efficiency: number, duration: number): number => {
    // Formula: efficiency (0-100) * 0.7 + capped duration score * 30
    const durationHours = duration / 60; // Convert minutes to hours
    const durationScore = Math.min(durationHours / 8, 1); // Cap at 8 hours
    return Math.round(efficiency * 0.7 + durationScore * 30);
  };

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
    metrics, // Pass through all fitbit metrics
    dataSource: metrics ? 'fitbit' : currentDayData ? 'csv' : null,
    isLoading: fitbitLoading
  };
};

