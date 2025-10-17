import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FitbitTrend } from "@/types/fitbit";

interface UseFitbitTrendsOptions {
  days?: number;
  userId?: string | null;
}

interface UseFitbitTrendsReturn {
  trends: FitbitTrend[];
  latestTrend: FitbitTrend | null;
  isLoading: boolean;
  lastUpdate: string | null;
  refresh: () => Promise<void>;
  userId: string | null;
}

export const useFitbitTrends = (options: UseFitbitTrendsOptions = {}): UseFitbitTrendsReturn => {
  const { days = 30, userId: providedUserId } = options;
  const [trends, setTrends] = useState<FitbitTrend[]>([]);
  const [latestTrend, setLatestTrend] = useState<FitbitTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  // Resolve user_id in priority order
  const resolveUserId = useCallback(async (): Promise<string | null> => {
    // Priority 1: Use provided userId if available
    if (providedUserId) {
      return providedUserId;
    }

    // Priority 2: Try authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      return user.id;
    }

    // Priority 3: Fallback to most recent user_id in fitbit_trends
    const { data, error } = await supabase
      .from("fitbit_trends")
      .select("user_id")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      console.error("[useFitbitTrends] Could not resolve user_id:", error);
      return null;
    }

    return data.user_id;
  }, [providedUserId]);

  const fetchTrends = useCallback(async () => {
    console.log(`[useFitbitTrends] Fetching trends for last ${days} days...`);
    setIsLoading(true);
    try {
      // Resolve user_id first
      const userId = await resolveUserId();
      if (!userId) {
        console.log("[useFitbitTrends] No user_id resolved, skipping fetch");
        setIsLoading(false);
        return;
      }

      setResolvedUserId(userId);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from("fitbit_trends")
        .select("*")
        .eq("user_id", userId)
        .gte("date", cutoffDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) {
        console.error("[useFitbitTrends] Error fetching trends:", error);
      } else if (data) {
        console.log(`[useFitbitTrends] Successfully fetched ${data.length} trend records for user ${userId}`);
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
  }, [days, resolveUserId]);

  // Initial fetch
  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // Real-time subscription for updates
  useEffect(() => {
    if (!resolvedUserId) return;

    const channel = supabase
      .channel("fitbit_trends_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fitbit_trends",
          filter: `user_id=eq.${resolvedUserId}`,
        },
        () => {
          console.log("Trends updated via realtime, refetching...");
          fetchTrends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrends, resolvedUserId]);

  // Listen for custom refresh events from Settings
  useEffect(() => {
    const handleRefresh = () => {
      console.log("Trends refresh event received");
      fetchTrends();
    };

    window.addEventListener("fitbit_trends_refresh", handleRefresh);
    return () => {
      window.removeEventListener("fitbit_trends_refresh", handleRefresh);
    };
  }, [fetchTrends]);

  return {
    trends,
    latestTrend,
    isLoading,
    lastUpdate,
    refresh: fetchTrends,
    userId: resolvedUserId,
  };
};
