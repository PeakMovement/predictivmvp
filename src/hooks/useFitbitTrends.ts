import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FitbitTrend } from "@/types/fitbit";

interface UseFitbitTrendsReturn {
  trends: FitbitTrend[];
  latestTrend: FitbitTrend | null;
  isLoading: boolean;
  lastUpdate: string | null;
  refresh: () => Promise<void>;
}

export const useFitbitTrends = (days: number = 30): UseFitbitTrendsReturn => {
  const [trends, setTrends] = useState<FitbitTrend[]>([]);
  const [latestTrend, setLatestTrend] = useState<FitbitTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    console.log(`[useFitbitTrends] Fetching trends for last ${days} days...`);
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("fitbit_trends")
        .select("*")
        .eq("user_id", "CTBNRR")
        .order("date", { ascending: false })
        .limit(days);

      if (error) {
        console.error("[useFitbitTrends] Error fetching trends:", error);
      } else if (data) {
        console.log(`[useFitbitTrends] Successfully fetched ${data.length} trend records`);
        setTrends(data as FitbitTrend[]);
        setLatestTrend(data.length > 0 ? (data[0] as FitbitTrend) : null);
        setLastUpdate(new Date().toISOString());
      } else {
        console.log("[useFitbitTrends] No trend data found");
      }
    } catch (err) {
      console.error("[useFitbitTrends] Failed to fetch trends:", err);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  // Initial fetch
  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Real-time subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel("fitbit_trends_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fitbit_trends",
          filter: `user_id=eq.CTBNRR`,
        },
        () => {
          console.log("Trends updated, refetching...");
          fetchTrends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrends]);

  return {
    trends,
    latestTrend,
    isLoading,
    lastUpdate,
    refresh: fetchTrends,
  };
};
