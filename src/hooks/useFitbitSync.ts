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

      // Verify with database
      const { data, error } = await supabase
        .from("fitbit_auto_data" as any)
        .select("activity, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

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
      const response = await fetch("/.netlify/functions/sync-auto", {
        method: "POST",
      });

      const contentType = response.headers.get("content-type");
      const isJson = contentType?.includes("application/json");

      if (!response.ok) {
        let errorMessage = "Sync failed";
        
        if (isJson) {
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = `Server error (${response.status})`;
          }
        } else {
          errorMessage = `Server error (${response.status}). Please try again.`;
        }
        
        throw new Error(errorMessage);
      }

      const result = isJson ? await response.json() : null;
      const now = new Date();
      
      toast({
        title: "✅ Fitbit Data Updated",
        description: `Synced ${result?.data?.steps || 0} steps, ${result?.data?.calories || 0} calories`,
      });

      setLastSync(now);
      localStorage.setItem('fitbit_last_sync', now.toISOString());
      await checkConnection();
      
      // Trigger refresh event for other components
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

    // Subscribe to real-time updates
    const channel = supabase
      .channel("fitbit-sync-status")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fitbit_auto_data",
        },
        () => {
          checkConnection();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
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
