import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FitbitTrend } from "@/types/fitbit";

interface UseFitbitTrendsReturn {
  trends: FitbitTrend[];
  isLoading: boolean;
  lastUpdate: string | null;
  refresh: () => Promise<void>;
}

export const useFitbitTrends = (days: number = 30): UseFitbitTrendsReturn => {
  const [trends, setTrends] = useState<FitbitTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("fitbit_trends")
        .select("*")
        .eq("user_id", "CTBNRR")
        .order("date", { ascending: false })
        .limit(days);

      if (error) {
        console.error("Error fetching trends:", error);
      } else if (data) {
        setTrends(data as FitbitTrend[]);
        setLastUpdate(new Date().toISOString());
      }
    } catch (err) {
      console.error("Failed to fetch trends:", err);
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
    isLoading,
    lastUpdate,
    refresh: fetchTrends,
  };
};
