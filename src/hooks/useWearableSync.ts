import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Explicit types for wearable data from Supabase
type WearableTokenRow = {
  access_token: string | null;
  expires_in: number | null;
  updated_at: string | null;
};

type WearableAutoDataRow = {
  fetched_at: string | null;
};

interface WearableSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  syncNow: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

export const useWearableSync = (): WearableSyncState => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const checkConnection = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsConnected(false);
        localStorage.removeItem('wearable_connected');
        localStorage.removeItem('wearable_last_sync');
        return false;
      }

      const { data: tokenData, error: tokenError } = await supabase
        .from("oura_tokens" as any)
        .select("access_token, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenError || !tokenData) {
        setIsConnected(false);
        localStorage.removeItem('wearable_connected');
        localStorage.removeItem('wearable_last_sync');
        console.info('[WearableSync] No Oura token found for user:', user.id);
        return false;
      }

      const token = tokenData as unknown as WearableTokenRow;
      const hasValidToken = !!token.access_token;
      setIsConnected(hasValidToken);

      if (!hasValidToken) {
        localStorage.removeItem('wearable_connected');
        localStorage.removeItem('wearable_last_sync');
        console.info('[WearableSync] Token exists but is invalid');
        return false;
      }

      localStorage.setItem('wearable_connected', 'true');

      const { data: syncData, error: syncError } = await supabase
        .from("wearable_auto_data" as any)
        .select("fetched_at")
        .eq("user_id", user.id)
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!syncError && syncData) {
        const sync = syncData as unknown as WearableAutoDataRow;
        if (sync.fetched_at) {
          const syncTime = new Date(sync.fetched_at);
          setLastSync(syncTime);
          localStorage.setItem('wearable_last_sync', syncTime.toISOString());
        }
      }

      console.info('[WearableSync] Connection check:', { connected: hasValidToken, userId: user.id });
      return hasValidToken;
    } catch (error) {
      console.error("Error checking wearable connection:", error);
      setIsConnected(false);
      localStorage.setItem('wearable_connected', 'false');
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

      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('fetch-oura-auto', {
        body: { user_id: user.id },
      });

      if (edgeError) throw new Error(edgeError.message);
      if (!edgeResult?.success) {
        throw new Error(edgeResult?.error || "Failed to sync data");
      }

      const fetchedEndpoints = edgeResult.fetched_endpoints || [];
      const date = edgeResult.date || 'today';
      const usersProcessed = edgeResult.users_processed || 0;

      if (usersProcessed === 0) {
        throw new Error("No Oura token found. Please connect your Oura Ring first.");
      }

      const entriesSynced = edgeResult.total_entries || 0;

      if (fetchedEndpoints.length === 0 || entriesSynced === 0) {
        toast({
          title: "No New Data Available",
          description: "Oura has no new data to sync. If you just connected, wear your ring tonight and sync tomorrow morning. Sleep data processes around 8 AM local time.",
          variant: "default",
        });
      } else {
        toast({
          title: "✅ Ōura Data Synced",
          description: `Successfully synced ${entriesSynced} day(s) of data across ${fetchedEndpoints.length} metrics`,
        });
      }

      const now = new Date();
      setLastSync(now);
      localStorage.setItem('wearable_last_sync', now.toISOString());
      await checkConnection();
      window.dispatchEvent(new CustomEvent('wearable_trends_refresh'));
    } catch (error: any) {
      console.error("Sync error:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync wearable data. Please try again.",
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
        .channel("wearable-sync-status")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wearable_auto_data",
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
