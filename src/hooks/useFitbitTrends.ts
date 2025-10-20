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

  // ✅ Resolve user_id with robust fallbacks
  const resolveUserId = useCallback(async (): Promise<string | null> => {
    if (providedUserId) return providedUserId;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.id) return user.id;

    const { data, error } = await supabase
      .from("fitbit_trends")
      .select("user_id")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (data?.user_id) return data.user_id;

    console.warn("[useFitbitTrends] Falling back to test user ID");
    return "8e3d1538-25f2-4270-9acc-da17b9106aa9"; // fallback UUID
  }, [providedUserId]);

  // ✅ Fetch Fitbit trend data
  const fetchTrends = useCallback(async () => {
    console.log(`[useFitbitTrends] Fetching last ${days} days of trends...`);
    setIsLoading(true);

    try {
      const userId = await resolveUserId();
      if (!userId) throw new Error("Unable to resolve user_id");

      setResolvedUserId(userId);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from("fitbit_trends")
        .select("*")
        .eq("user_id", userId)
        .gte("date", cutoffDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`[useFitbitTrends] Retrieved ${data.length} records for user ${userId}`);
        setTrends(data as FitbitTrend[]);
        setLatestTrend(data[0] as FitbitTrend);
        setLastUpdate(new Date().toISOString());
      } else {
        console.warn("[useFitbitTrends] No data found for this user");
        setTrends([]);
        setLatestTrend(null);
      }
    } catch (err) {
      console.error("[useFitbitTrends] Fetch failed:", err);
      setTrends([]);
      setLatestTrend(null);
    } finally {
      setIsLoading(false);
    }
  }, [days, resolveUserId]);

  // 🔄 Initial fetch
  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  // 🧠 Real-time updates
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
          console.log("[useFitbitTrends] Real-time update detected, refetching...");
          fetchTrends();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedUserId, fetchTrends]);

  // 🚀 Listen for external refresh triggers
  useEffect(() => {
    const handleRefresh = () => fetchTrends();
    const handleDataRefreshed = () => fetchTrends();

    window.addEventListener("fitbit_trends_refresh", handleRefresh);
    window.addEventListener("fitbit_data_refreshed", handleDataRefreshed);

    return () => {
      window.removeEventListener("fitbit_trends_refresh", handleRefresh);
      window.removeEventListener("fitbit_data_refreshed", handleDataRefreshed);
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
