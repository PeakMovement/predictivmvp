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
        .eq("source", "oura")
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

      console.log('[WearableSync] Starting sync for user:', user.id);

      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('fetch-oura-auto', {
        body: { user_id: user.id },
      });

      if (edgeError) {
        console.error('[WearableSync] Edge function error:', edgeError);
        
        // Parse error message
        let errorMessage = edgeError.message || "Sync failed";
        
        if (edgeError.context?.body) {
          try {
            const errorBody = typeof edgeError.context.body === 'string'
              ? JSON.parse(edgeError.context.body)
              : edgeError.context.body;
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        throw new Error(errorMessage);
      }

      if (!edgeResult?.success) {
        const errorMsg = edgeResult?.error || "Sync failed with unknown error";
        throw new Error(errorMsg);
      }

      const usersProcessed = edgeResult.users_processed || 0;
      const entriesSynced = edgeResult.total_entries || 0;
      const fetchedEndpoints = edgeResult.fetched_endpoints || [];

      console.log('[WearableSync] Sync result:', { usersProcessed, entriesSynced, fetchedEndpoints });

      if (usersProcessed === 0) {
        throw new Error("No Oura Ring connected. Please connect in Settings.");
      }

      // Update local state
      const now = new Date();
      setLastSync(now);
      localStorage.setItem('wearable_last_sync', now.toISOString());
      
      // Dispatch refresh event for other components
      window.dispatchEvent(new CustomEvent('wearable_trends_refresh'));

      // Show appropriate toast
      if (entriesSynced === 0 || fetchedEndpoints.length === 0) {
        toast({
          title: "No New Data",
          description: "Your Oura data is already up to date. New data typically appears in the morning.",
        });
      } else {
        toast({
          title: "Sync Complete",
          description: `Synced ${entriesSynced} day(s) from ${fetchedEndpoints.length} metric(s)`,
        });
      }

      // Recheck connection status
      await checkConnection();
      
    } catch (error: any) {
      console.error("[WearableSync] Sync error:", error);
      
      const errorMessage = error.message || "Failed to sync wearable data";
      setLastError(errorMessage);
      
      // Map technical errors to user-friendly messages
      let userMessage = errorMessage;
      if (errorMessage.includes("No Oura") || errorMessage.includes("token")) {
        userMessage = "Please connect your Oura Ring in Settings";
      } else if (errorMessage.includes("expired") || errorMessage.includes("reconnect")) {
        userMessage = "Your Oura connection expired. Please reconnect in Settings.";
      }

      toast({
        title: "Sync Failed",
        description: userMessage,
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
