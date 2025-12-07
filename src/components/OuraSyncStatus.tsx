import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Clock, Loader2, AlertCircle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNowStrict } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SyncState {
  status: "idle" | "syncing" | "success" | "error";
  lastSync: Date | null;
  errorMessage: string | null;
  errorCode: string | null;
}

const OuraSyncStatus = () => {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    lastSync: null,
    errorMessage: null,
    errorCode: null,
  });
  const { toast } = useToast();

  const fetchLastSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) return;

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("fetched_at")
        .eq("user_id", user.id)
        .eq("source", "oura")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[OuraSyncStatus] Could not fetch last sync:", error.message);
        return;
      }

      if (data?.fetched_at) {
        setState((prev) => ({ ...prev, lastSync: new Date(data.fetched_at) }));
      }
    } catch (err) {
      console.error("[OuraSyncStatus] Fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLastSync();

    const handleRefresh = () => fetchLastSync();
    window.addEventListener("wearable_trends_refresh", handleRefresh);
    return () => window.removeEventListener("wearable_trends_refresh", handleRefresh);
  }, []);

  const handleSync = async () => {
    try {
      setState((prev) => ({ 
        ...prev, 
        status: "syncing", 
        errorMessage: null, 
        errorCode: null 
      }));
      console.log('[OuraSyncStatus] Starting manual sync...');

      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw { 
          message: "Please log in to sync your Oura Ring data",
          code: "NOT_AUTHENTICATED"
        };
      }

      const { data, error } = await supabase.functions.invoke('fetch-oura-data', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error('[OuraSyncStatus] Edge function error:', error);
        
        // Parse error from edge function response
        let errorMessage = error.message || "Sync failed";
        let errorCode = "SYNC_FAILED";

        // Try to get more specific error from context
        if (error.context?.body) {
          try {
            const errorBody = typeof error.context.body === 'string'
              ? JSON.parse(error.context.body)
              : error.context.body;
            if (errorBody.error) {
              errorMessage = errorBody.error;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Map common errors to user-friendly messages
        if (errorMessage.includes("No Oura") || errorMessage.includes("reconnect")) {
          errorCode = "NO_TOKEN";
          errorMessage = "Please connect your Oura Ring in Settings";
        } else if (errorMessage.includes("expired") || errorMessage.includes("invalid")) {
          errorCode = "TOKEN_EXPIRED";
          errorMessage = "Your Oura authorization expired. Please reconnect.";
        }

        throw { message: errorMessage, code: errorCode };
      }

      // Check for success with potential issues
      if (data?.success) {
        const entriesSynced = data.entries_synced || 0;
        
        console.log('[OuraSyncStatus] Sync complete:', data);
        
        // Dispatch refresh event
        window.dispatchEvent(new Event("wearable_trends_refresh"));
        await fetchLastSync();

        setState((s) => ({
          ...s,
          status: "success",
          lastSync: new Date(),
          errorMessage: null,
          errorCode: null,
        }));

        if (entriesSynced > 0) {
          toast({
            title: "Sync Complete",
            description: `Synced ${entriesSynced} day(s) of Oura data`,
          });
        } else {
          toast({
            title: "No New Data",
            description: "Your Oura data is up to date",
          });
        }

        setTimeout(() => setState((s) => ({ ...s, status: "idle" })), 3000);
      } else {
        throw { 
          message: data?.error || "Sync failed with unknown error", 
          code: "UNKNOWN_ERROR" 
        };
      }
    } catch (err: any) {
      console.error("[OuraSyncStatus] Sync error:", err);
      
      const errorMessage = err?.message || "Failed to sync Oura data";
      const errorCode = err?.code || "SYNC_FAILED";
      
      setState((prev) => ({ 
        ...prev, 
        status: "error",
        errorMessage,
        errorCode,
      }));

      toast({
        title: "Sync Failed",
        description: errorMessage,
        variant: "destructive",
      });

      setTimeout(() => setState((s) => ({ ...s, status: "idle" })), 8000);
    }
  };

  const getTimeSinceSync = () => {
    if (!state.lastSync) return "Never synced";
    return `Updated ${formatDistanceToNowStrict(state.lastSync)} ago`;
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case "syncing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "error":
        if (state.errorCode === "NO_TOKEN" || state.errorCode === "NOT_AUTHENTICATED") {
          return <WifiOff className="h-3 w-3 text-amber-500" />;
        }
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case "syncing":
        return "Syncing...";
      case "success":
        return "Synced just now";
      case "error":
        if (state.errorCode === "NO_TOKEN") {
          return "Connect Oura Ring";
        }
        return state.errorMessage || "Sync failed";
      default:
        return getTimeSinceSync();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
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

      <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[200px] text-center">
        {getStatusIcon()}
        <span className={state.status === "error" ? "text-red-500" : ""}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default OuraSyncStatus;
