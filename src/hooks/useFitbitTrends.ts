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

  /* -------------------- Resolve User ID -------------------- */
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

    if (error || !data) {
      console.warn("[useFitbitTrends] Could not resolve user_id:", error);
      return null;
    }

    return data.user_id;
  }, [providedUserId]);

  /* -------------------- Fetch Trends -------------------- */
  const fetchTrends = useCallback(async () => {
    console.log(`[useFitbitTrends] Fetching Fitbit trends (${days} days)...`);
    setIsLoading(true);

    try {
      const userId = await resolveUserId();
      if (!userId) {
        console.warn("[useFitbitTrends] No user_id resolved — skipping fetch.");
        setIsLoading(false);
        return;
      }

      setResolvedUserId(userId);

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const { data, error } = await supabase
        .from("fitbit_trends")
        .select("*")
        .eq("user_id", userId)
        .gte("date", cutoff.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;

      setTrends(data || []);
      setLatestTrend(data?.[0] || null);
      setLastUpdate(new Date().toISOString());

      console.log(`[useFitbitTrends] ✅ Loaded ${data?.length || 0} records.`);
    } catch (err) {
      console.error("[useFitbitTrends] Fetch failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [days, resolveUserId]);

  /* -------------------- Initial Fetch -------------------- */
  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  /* -------------------- Real-time Supabase Subscription -------------------- */
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
          console.log("[useFitbitTrends] 🔁 Realtime update detected, refetching…");
          fetchTrends();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTrends, resolvedUserId]);

  /* -------------------- Event Listeners (Manual Refresh + Fitbit Sync) -------------------- */
  useEffect(() => {
    const handleRefresh = () => {
      console.log("[useFitbitTrends] 🔄 Manual refresh triggered.");
      fetchTrends();
    };

    const handleDataRefreshed = () => {
      console.log("[useFitbitTrends] 📱 Fitbit data refreshed event received.");
      fetchTrends();
    };

    window.addEventListener("fitbit_trends_refresh", handleRefresh);
    window.addEventListener("fitbit_data_refreshed", handleDataRefreshed);

    return () => {
      window.removeEventListener("fitbit_trends_refresh", handleRefresh);
      window.removeEventListener("fitbit_data_refreshed", handleDataRefreshed);
    };
  }, [fetchTrends]);

  /* -------------------- Return -------------------- */
  return {
    trends,
    latestTrend,
    isLoading,
    lastUpdate,
    refresh: fetchTrends,
    userId: resolvedUserId,
  };
};
