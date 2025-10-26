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
      const cachedStatus = localStorage.getItem('fitbit_connected');
      const cachedSync = localStorage.getItem('fitbit_last_sync');

      if (cachedStatus === 'true') {
        setIsConnected(true);
        if (cachedSync) {
          setLastSync(new Date(cachedSync));
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsConnected(false);
        localStorage.setItem('fitbit_connected', 'false');
        return false;
      }

      const { data: tokenData, error: tokenError } = await supabase
        .from("fitbit_tokens" as any)
        .select("access_token, expires_in, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenError || !tokenData) {
        setIsConnected(false);
        localStorage.setItem('fitbit_connected', 'false');
        return false;
      }

      const hasValidToken = !!tokenData.access_token;
      setIsConnected(hasValidToken);
      localStorage.setItem('fitbit_connected', String(hasValidToken));

      const { data: syncData } = await supabase
        .from("fitbit_auto_data" as any)
        .select("fetched_at")
        .eq("user_id", user.id)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncData?.fetched_at) {
        const syncTime = new Date(syncData.fetched_at);
        setLastSync(syncTime);
        localStorage.setItem('fitbit_last_sync', syncTime.toISOString());
      }

      console.info('[FitbitSync] Connection check:', { connected: hasValidToken, userId: user.id });
      return hasValidToken;
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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('fitbit-fetch-data', {
        body: { user_id: user.id },
      });

      if (edgeError) throw new Error(edgeError.message);
      if (!edgeResult?.success) {
        throw new Error(edgeResult?.error || "Failed to sync data");
      }

      const steps = edgeResult.steps || 0;
      const calories = edgeResult.calories || 0;

      const now = new Date();
      toast({
        title: "Fitbit Data Updated",
        description: `Synced ${steps} steps, ${calories} calories`,
      });

      setLastSync(now);
      localStorage.setItem('fitbit_last_sync', now.toISOString());
      await checkConnection();
      window.dispatchEvent(new CustomEvent('fitbit_trends_refresh'));
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
