import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface FitbitSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  syncNow: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

export const useFitbitSync = (): FitbitSyncState => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const checkConnection = async (): Promise<boolean> => {
    try {
      // Check localStorage first for instant feedback
      const cachedStatus = localStorage.getItem('fitbit_connected');
      const cachedSync = localStorage.getItem('fitbit_last_sync');
      
      if (cachedStatus === 'true') {
        setIsConnected(true);
        if (cachedSync) {
          setLastSync(new Date(cachedSync));
        }
      }

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Verify with database, filter by user if available
      let query = supabase
        .from("fitbit_auto_data" as any)
        .select("activity, fetched_at, user_id")
        .order("fetched_at", { ascending: false });
      
      if (userId) {
        query = query.eq("user_id", userId);
      }
      
      const { data, error } = await query.limit(1).maybeSingle();

      if (error || !data) {
        setIsConnected(false);
        localStorage.setItem('fitbit_connected', 'false');
        return false;
      }

      const activityData = data as any;
      const hasTokens = !!activityData?.activity?.tokens?.access_token;
      const expiresAt = activityData?.activity?.tokens?.expires_at;
      const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
      
      const connected = hasTokens && !isExpired;
      setIsConnected(connected);
      localStorage.setItem('fitbit_connected', String(connected));
      
      if (activityData.fetched_at) {
        const syncTime = new Date(activityData.fetched_at);
        setLastSync(syncTime);
        localStorage.setItem('fitbit_last_sync', syncTime.toISOString());
      }
      
      console.info('[FitbitSync] Connection check:', { connected, userId: activityData.user_id });
      return connected;
    } catch (error) {
      console.error("Error checking Fitbit connection:", error);
      setIsConnected(false);
      localStorage.setItem('fitbit_connected', 'false');
      return false;
    }
  };

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      // Call Supabase Edge Function (Lovable projects use Supabase, not Netlify)
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('fetch-fitbit-auto', {
        body: {},
      });

      if (edgeError) throw new Error(edgeError.message);

      // Fetch latest data to show in toast
      const { data: { user } } = await supabase.auth.getUser();
      const { data: latestData, error: fetchError } = await supabase
        .from("fitbit_auto_data" as any)
        .select("activity")
        .eq("user_id", user?.id || "CTBNRR")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const activityRecord = latestData as any;
      const steps = activityRecord?.activity?.data?.summary?.steps || 0;
      const calories = activityRecord?.activity?.data?.summary?.caloriesOut || 0;

      const now = new Date();
      toast({
        title: "✅ Fitbit Data Updated",
        description: `Synced ${steps} steps, ${calories} calories`,
      });

      setLastSync(now);
      localStorage.setItem('fitbit_last_sync', now.toISOString());
      await checkConnection();
      window.dispatchEvent(new CustomEvent('fitbit_data_refreshed'));
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Fitbit data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkConnection();

    // Get user ID for filtered subscription
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      // Subscribe to real-time updates filtered by user
      const channel = supabase
        .channel("fitbit-sync-status")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "fitbit_auto_data",
            filter: userId ? `user_id=eq.${userId}` : undefined,
          },
          () => {
            checkConnection();
          }
        )
        .subscribe();

      return channel;
    };

    let channel: any;
    setupSubscription().then(ch => { channel = ch; });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return {
    isConnected,
    isSyncing,
    lastSync,
    syncNow,
    checkConnection,
  };
};
