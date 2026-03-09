import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// Explicit types for wearable data from Supabase
type WearableTokenRow = {
  access_token: string | null;
  expires_at: string | null;
  refresh_token: string | null;
};

interface WearableSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  lastError: string | null;
  syncNow: () => Promise<void>;
  checkConnection: () => Promise<boolean>;
}

export const useWearableSync = (): WearableSyncState => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const checkConnection = useCallback(async (): Promise<boolean> => {
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
        .select("access_token, expires_at, refresh_token")
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
      const hasValidToken = !!token.access_token && !!token.refresh_token;
      
      // Check if token is not expired (with 5 min buffer for proactive refresh)
      let isTokenValid = hasValidToken;
      if (hasValidToken && token.expires_at) {
        const expiresAt = new Date(token.expires_at);
        const now = new Date();
        const bufferMs = 5 * 60 * 1000; // 5 minutes
        isTokenValid = expiresAt.getTime() - now.getTime() > -bufferMs; // Allow some grace period
      }

      setIsConnected(isTokenValid);

      if (!isTokenValid) {
        localStorage.removeItem('wearable_connected');
        console.info('[WearableSync] Token invalid or incomplete');
        return false;
      }

      localStorage.setItem('wearable_connected', 'true');

      // Get last sync time from wearable_sessions
      const { data: syncData } = await supabase
        .from("wearable_sessions")
        .select("fetched_at")
        .eq("user_id", user.id)
        .in("source", ["oura", "garmin", "polar"])
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (syncData?.fetched_at) {
        const syncTime = new Date(syncData.fetched_at);
        setLastSync(syncTime);
        localStorage.setItem('wearable_last_sync', syncTime.toISOString());
      }

      console.info('[WearableSync] Connection verified:', { connected: isTokenValid, userId: user.id });
      return isTokenValid;
    } catch (error) {
      console.error("[WearableSync] Error checking connection:", error);
      setIsConnected(false);
      return false;
    }
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    setLastError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in to sync your data");
      }


      // Detect which devices are connected
      const { data: tokens } = await supabase
        .from("wearable_tokens")
        .select("scope")
        .eq("user_id", user.id);

      const scopes = tokens?.map(t => t.scope) ?? [];

      if (scopes.length === 0) {
        throw new Error("No wearable devices connected. Please connect one in Settings.");
      }

      const deviceNames: Record<string, string> = { oura: "Oura Ring", garmin: "Garmin", polar: "Polar" };
      const invocations: Array<{ scope: string; promise: Promise<any> }> = scopes.flatMap(scope => {
        if (scope === "oura") return [{ scope, promise: supabase.functions.invoke("fetch-oura-data", { body: { user_id: user.id } }) }];
        if (scope === "garmin") return [{ scope, promise: supabase.functions.invoke("fetch-garmin-data", { body: { user_id: user.id } }) }];
        return [];
      });

      const results = await Promise.allSettled(invocations.map(i => i.promise));
      const succeeded = results.map((r, i) => r.status === "fulfilled" ? invocations[i].scope : null).filter(Boolean);
      const failed = results.map((r, i) => r.status === "rejected" ? invocations[i].scope : null).filter(Boolean);


      // Update local state on any success
      if (succeeded.length > 0) {
        const now = new Date();
        setLastSync(now);
        localStorage.setItem('wearable_last_sync', now.toISOString());
        window.dispatchEvent(new CustomEvent('wearable_trends_refresh'));
      }

      // Recheck connection status
      await checkConnection();

      const succeededLabels = succeeded.map(s => deviceNames[s!] ?? s).join(" & ");
      const failedLabels = failed.map(s => deviceNames[s!] ?? s).join(" & ");

      if (failed.length > 0 && succeeded.length === 0) {
        throw new Error(`Couldn't reach ${failedLabels}. Check your connection or reconnect in Settings.`);
      } else if (failed.length > 0) {
        toast({
          title: "Partially synced",
          description: `${succeededLabels} updated. ${failedLabels} failed — try reconnecting in Settings.`,
        });
      } else {
        toast({
          title: "Sync Complete",
          description: `${succeededLabels} data is up to date.`,
        });
      }
      
    } catch (error: any) {
      console.error("[WearableSync] Sync error:", error);
      
      const errorMessage = error.message || "Failed to sync wearable data";
      setLastError(errorMessage);

      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  }, [checkConnection]);

  useEffect(() => {
    checkConnection();

    // Setup real-time subscription for sync status updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return null;

      const channel = supabase
        .channel("wearable-sync-status")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wearable_sessions",
            filter: `user_id=eq.${user.id}`,
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
  }, [checkConnection]);

  return {
    isConnected,
    isSyncing,
    lastSync,
    lastError,
    syncNow,
    checkConnection,
  };
};
