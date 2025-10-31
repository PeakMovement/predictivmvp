import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FitbitTrend } from "@/types/fitbit";

interface UseTrainingTrendsOptions {
  days?: number;
  userId?: string | null;
}

interface UseTrainingTrendsReturn {
  trends: FitbitTrend[];
  latestTrend: FitbitTrend | null;
  isLoading: boolean;
  lastUpdate: string | null;
  refresh: () => Promise<void>;
  userId: string | null;
}

export const useTrainingTrends = (options: UseTrainingTrendsOptions = {}): UseTrainingTrendsReturn => {
  const { days = 30, userId: providedUserId } = options;
  const [trends, setTrends] = useState<FitbitTrend[]>([]);
  const [latestTrend, setLatestTrend] = useState<FitbitTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  const resolveUserId = useCallback(async (): Promise<string | null> => {
    if (providedUserId) return providedUserId;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    return user?.id || null;
  }, [providedUserId]);

  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const userId = await resolveUserId();
      if (!userId) return;

      setResolvedUserId(userId);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from("training_trends")
        .select("*")
        .eq("user_id", userId)
        .gte("date", cutoffDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;

      setTrends(data || []);
      setLatestTrend(data?.[0] || null);
      setLastUpdate(new Date().toISOString());
    } catch {
      setTrends([]);
      setLatestTrend(null);
    } finally {
      setIsLoading(false);
    }
  }, [days, resolveUserId]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  useEffect(() => {
    if (!resolvedUserId) return;

    const channel = supabase
      .channel("training_trends_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "training_trends",
          filter: `user_id=eq.${resolvedUserId}`,
        },
        fetchTrends,
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [resolvedUserId, fetchTrends]);

  useEffect(() => {
    const handleRefresh = () => fetchTrends();
    window.addEventListener("wearable_trends_refresh", handleRefresh);
    return () => {
      window.removeEventListener("wearable_trends_refresh", handleRefresh);
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
