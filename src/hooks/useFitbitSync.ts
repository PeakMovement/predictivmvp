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
      const { data, error } = await supabase
        .from("fitbit_auto_data" as any)
        .select("activity, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        setIsConnected(false);
        return false;
      }

      const activityData = data as any;
      const hasTokens = !!activityData?.activity?.tokens?.access_token;
      setIsConnected(hasTokens);
      
      if (activityData.fetched_at) {
        setLastSync(new Date(activityData.fetched_at));
      }
      
      return hasTokens;
    } catch (error) {
      console.error("Error checking Fitbit connection:", error);
      setIsConnected(false);
      return false;
    }
  };

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/.netlify/functions/sync-auto", {
        method: "POST",
      });

      // Check if response is JSON before parsing
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
          // HTML error page returned
          errorMessage = `Server error (${response.status}). Please try again.`;
        }
        
        throw new Error(errorMessage);
      }

      const result = isJson ? await response.json() : null;
      
      toast({
        title: "Sync Successful",
        description: `Synced ${result?.data?.steps || 0} steps, ${result?.data?.calories || 0} calories`,
      });

      setLastSync(new Date());
      await checkConnection();
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
