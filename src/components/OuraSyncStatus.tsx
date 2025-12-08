import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Clock, Loader2, AlertCircle, WifiOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNowStrict } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";

interface SyncState {
  status: "idle" | "syncing" | "success" | "error";
  errorMessage: string | null;
  errorCode: string | null;
}

const OuraSyncStatus = () => {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    errorMessage: null,
    errorCode: null,
  });
  const { toast } = useToast();
  const { isConnected, isLoading: tokenLoading, lastSync, error: tokenError, errorCode: tokenErrorCode } = useOuraTokenStatus();

  // Show connection status from token hook
  const effectiveError = state.errorCode || tokenErrorCode;
  const effectiveErrorMessage = state.errorMessage || tokenError;

  const handleForceSync = async () => {
    try {
      setState({ status: "syncing", errorMessage: null, errorCode: null });
      console.log('[OuraSyncStatus] Starting force refresh...');

      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        throw { message: "Please log in to sync your Oura Ring data", code: "NOT_AUTHENTICATED" };
      }

      const response = await fetch(
        `https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/fetch-oura-data`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHdia2lreXVleHNrZGdmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjU4NDgsImV4cCI6MjA3MzMwMTg0OH0.c0w5R1_eKeNytHJgdxUJ2VPkQcnxE1KlyqXPCuJ77Fg',
          },
          body: JSON.stringify({ user_id: user.id }),
        }
      );

      const data = await response.json();
      
      if (!response.ok || !data.success) {
        console.error('[OuraSyncStatus] Edge function error:', data);
        
        let errorMessage = data.error || "Sync failed";
        let errorCode = data.error_code || "SYNC_FAILED";

        if (errorCode === "NO_TOKEN" || errorMessage.includes("No Oura") || errorMessage.includes("connect")) {
          errorCode = "NO_TOKEN";
          errorMessage = "Please connect your Oura Ring in Settings";
        } else if (errorCode === "TOKEN_EXPIRED" || errorMessage.includes("expired") || errorMessage.includes("reconnect")) {
          errorCode = "TOKEN_EXPIRED";
          errorMessage = "Your Oura authorization expired. Please reconnect.";
        }

        throw { message: errorMessage, code: errorCode };
      }

      const entriesSynced = data.entries_synced || 0;
      console.log('[OuraSyncStatus] Force sync complete:', data);
      
      window.dispatchEvent(new Event("wearable_trends_refresh"));

      setState({ status: "success", errorMessage: null, errorCode: null });

      if (entriesSynced > 0) {
        toast({ title: "Sync Complete", description: `Synced ${entriesSynced} day(s) of Oura data` });
      } else {
        toast({ title: "Up to Date", description: "Your Oura data is already current" });
      }

      setTimeout(() => setState((s) => ({ ...s, status: "idle" })), 3000);
    } catch (err: any) {
      console.error("[OuraSyncStatus] Sync error:", err);
      
      setState({ 
        status: "error",
        errorMessage: err?.message || "Failed to sync",
        errorCode: err?.code || "SYNC_FAILED",
      });

      toast({
        title: "Sync Failed",
        description: err?.message || "Failed to sync Oura data",
        variant: "destructive",
      });

      setTimeout(() => setState((s) => ({ ...s, status: "idle" })), 8000);
    }
  };

  const getTimeSinceSync = () => {
    if (!lastSync) return "Auto-sync active";
    return `Synced ${formatDistanceToNowStrict(lastSync)} ago`;
  };

  const getStatusIcon = () => {
    if (state.status === "syncing") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (state.status === "success") return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    if (state.status === "error" || effectiveError) {
      if (effectiveError === "NO_TOKEN" || effectiveError === "NOT_AUTHENTICATED") {
        return <WifiOff className="h-3 w-3 text-amber-500" />;
      }
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
    if (isConnected) return <Zap className="h-3 w-3 text-green-500" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (state.status === "syncing") return "Syncing...";
    if (state.status === "success") return "Synced just now";
    if (state.status === "error") return state.errorMessage || "Sync failed";
    if (effectiveError === "NO_TOKEN") return "Connect Oura Ring";
    if (effectiveError === "TOKEN_EXPIRED") return "Reconnect Oura";
    if (effectiveError) return effectiveErrorMessage || "Connection issue";
    return getTimeSinceSync();
  };

  if (tokenLoading) {
    return (
      <div className="flex flex-col items-center gap-2">
        <Button variant="outline" size="sm" disabled className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking...</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleForceSync}
        disabled={state.status === "syncing" || !isConnected}
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
            <span>Force Refresh</span>
          </>
        )}
      </Button>

      <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[200px] text-center">
        {getStatusIcon()}
        <span className={state.status === "error" || effectiveError ? "text-amber-500" : ""}>
          {getStatusText()}
        </span>
      </div>
    </div>
  );
};

export default OuraSyncStatus;
