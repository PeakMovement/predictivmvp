import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FitbitTrend {
  id: string;
  user_id: string;
  date: string;
  hrv: number | null;
  acwr: number | null;
  ewma: number | null;
  strain: number | null;
  monotony: number | null;
  training_load: number | null;
  acute_load: number | null;
  chronic_load: number | null;
  created_at: string;
}

interface UseFitbitTrendsReturn {
  trends: FitbitTrend[];
  latestTrend: FitbitTrend | null;
  isLoading: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
}

export function useFitbitTrends(days: number = 30): UseFitbitTrendsReturn {
  const [trends, setTrends] = useState<FitbitTrend[]>([]);
  const [latestTrend, setLatestTrend] = useState<FitbitTrend | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('fitbit_trends')
        .select('*')
        .gte('date', cutoffDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching fitbit trends:', error);
        return;
      }

      setTrends(data || []);
      setLatestTrend(data && data.length > 0 ? data[0] : null);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error in fetchTrends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchTrends();

    // Set up realtime subscription
    const channel = supabase
      .channel('fitbit_trends_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fitbit_trends'
        },
        () => {
          console.log('Fitbit trends updated, refreshing...');
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
    refresh: fetchTrends
  };
}
