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

      // Check all token sources: oura_tokens, wearable_tokens (garmin), polar_tokens
      let anyConnected = false;

      // 1. Check oura_tokens
      const { data: ouraToken } = await supabase
        .from("oura_tokens" as any)
        .select("access_token, expires_at, refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ouraToken) {
        const token = ouraToken as unknown as WearableTokenRow;
        const hasValid = !!token.access_token && !!token.refresh_token;
        let isValid = hasValid;
        if (hasValid && token.expires_at) {
          const expiresAt = new Date(token.expires_at);
          const bufferMs = 5 * 60 * 1000;
          isValid = expiresAt.getTime() - Date.now() > -bufferMs;
        }
        if (isValid) anyConnected = true;
      }

      // 2. Check wearable_tokens (garmin/oura)
      if (!anyConnected) {
        const { data: wearableTokens } = await supabase
          .from("wearable_tokens")
          .select("scope")
          .eq("user_id", user.id);
        if (wearableTokens && wearableTokens.length > 0) anyConnected = true;
      }

      // 3. Check polar_tokens
      if (!anyConnected) {
        const { data: polarToken } = await supabase
          .from("polar_tokens")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (polarToken) anyConnected = true;
      }

      setIsConnected(anyConnected);

      if (!anyConnected) {
        localStorage.removeItem('wearable_connected');
        console.info('[WearableSync] No valid tokens found');
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

      console.info('[WearableSync] Connection verified:', { connected: anyConnected, userId: user.id });
      return anyConnected;
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


      // Detect which devices are connected. Check Polar BEFORE the
      // "no devices" guard so a Polar-only user isn't rejected.
      const [{ data: tokens }, { data: polarToken }] = await Promise.all([
        supabase.from("wearable_tokens").select("scope").eq("user_id", user.id),
        supabase.from("polar_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);

      const scopes = tokens?.map(t => t.scope) ?? [];
      if (polarToken && !scopes.includes("polar")) {
        scopes.push("polar");
      }

      if (scopes.length === 0) {
        throw new Error("No wearable devices connected. Please connect one in Settings.");
      }

      const deviceNames: Record<string, string> = { oura: "Oura Ring", garmin: "Garmin", polar: "Polar" };
      const invocations: Array<{ scope: string; promise: Promise<any> }> = scopes.flatMap(scope => {
        if (scope === "oura") return [{ scope, promise: supabase.functions.invoke("fetch-oura-data", { body: { user_id: user.id } }) }];
        if (scope === "garmin") return [{ scope, promise: supabase.functions.invoke("fetch-garmin-data", { body: { user_id: user.id } }) }];
        if (scope === "polar") return [
          { scope, promise: supabase.functions.invoke("fetch-polar-exercises", { body: { user_id: user.id } }) },
          { scope: "polar-sleep", promise: supabase.functions.invoke("fetch-polar-sleep", { body: { user_id: user.id } }) },
        ];
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
