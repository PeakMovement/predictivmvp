import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNowStrict } from "date-fns";

interface SyncState {
  status: "idle" | "syncing" | "success" | "error";
  lastSync: Date | null;
}

const FitbitSyncStatus = () => {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    lastSync: null,
  });

  // 🔍 Fetch latest sync timestamp from wearable_auto_data.fetched_at
  const fetchLastSync = async () => {
    try {
      const { data, error } = await supabase
        .from("wearable_auto_data")
        .select("fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("⚠️ FitbitSyncStatus: Could not fetch last sync:", error.message);
        return;
      }

      if (data?.fetched_at) {
        setState((prev) => ({ ...prev, lastSync: new Date(data.fetched_at) }));
      }
    } catch (err) {
      console.error("❌ FitbitSyncStatus fetch error:", err);
    }
  };

  // Initial fetch and listen for refresh events
  useEffect(() => {
    fetchLastSync();
    
    const handleRefresh = () => fetchLastSync();
    window.addEventListener("fitbit_trends_refresh", handleRefresh);
    return () => window.removeEventListener("fitbit_trends_refresh", handleRefresh);
  }, []);

  // ⏱️ Handle Fitbit manual refresh
  const handleSync = async () => {
    try {
      setState((prev) => ({ ...prev, status: "syncing" }));
      console.log('🔄 Starting manual Fitbit sync...');

      // Trigger backend sync using Supabase function
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke('wearable-fetch-data', { 
        body: { user_id: user?.id } 
      });
      
      if (error) {
        console.error('Sync error:', error);
        const errorMessage = error.message || "Sync failed";
        
        // Check if it's a token issue
        if (errorMessage.includes('reconnect') || errorMessage.includes('token')) {
          throw new Error('Please reconnect your Fitbit account in Settings → Connected Devices');
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ Sync complete:', data);

      // Wait a moment for database to update and trends to calculate
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Fire unified custom event for UI to auto-refresh
      window.dispatchEvent(new Event("wearable_trends_refresh"));

      // Fetch latest sync time from database
      await fetchLastSync();

      // ✅ Update status
      setState((s) => ({
        ...s,
        status: "success",
        lastSync: new Date(),
      }));

      setTimeout(() => setState((s) => ({ ...s, status: "idle" })), 3000);
    } catch (err: any) {
      console.error("❌ Fitbit sync error:", err);
      setState((prev) => ({ ...prev, status: "error" }));
      
      // Show error toast with specific message
      const errorMsg = err.message || 'Failed to sync Fitbit data';
      console.error('User-facing error:', errorMsg);
      
      setTimeout(() => setState((s) => ({ ...s, status: "idle" })), 5000);
    }
  };

  // 🕓 Format "Updated X minutes ago"
  const getTimeSinceSync = () => {
    if (!state.lastSync) return "Never synced";
    return `Updated ${formatDistanceToNowStrict(state.lastSync)} ago`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* 🔄 Sync Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={state.status === "syncing"}
        className="flex items-center gap-2"
      >
        {state.status === "syncing" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Syncing…</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" />
            <span>Update Now</span>
          </>
        )}
      </Button>

      {/* ⏱️ Status Line */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {state.status === "success" && (
          <>
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            <span>Synced just now</span>
          </>
        )}
        {state.status === "error" && (
          <>
            <Clock className="h-3 w-3 text-red-500" />
            <span>Sync failed</span>
          </>
        )}
        {state.status === "idle" && (
          <>
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span>{getTimeSinceSync()}</span>
          </>
        )}
      </div>
    </div>
  );
};

export default FitbitSyncStatus;
