import { useEffect, useState } from "react";
import { RefreshCw, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNowStrict } from "date-fns";

interface SyncState {
  status: "idle" | "syncing" | "success" | "error";
  lastSync: Date | null;
}

export const FitbitSyncStatus = () => {
  const [state, setState] = useState<SyncState>({
    status: "idle",
    lastSync: null,
  });

  // 🔍 Fetch latest sync timestamp from fitbit_trends
  const fetchLastSync = useCallback(async () => {
    // 1) Try precise timestamp from ingestion table
    const { data: auto, error: autoErr } = await supabase
      .from("fitbit_auto_data")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (!autoErr && auto?.fetched_at) {
      setLastSync(new Date(auto.fetched_at));
      return;
    }

    // 2) Fallback to latest trend "date" (daily)
    const { data: trend, error: trendErr } = await supabase
      .from("fitbit_trends")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (!trendErr && trend?.date) {
      setLastSync(new Date(trend.date));
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchLastSync();
  }, []);

  // ⏱️ Handle Fitbit manual refresh
  const handleSync = async () => {
    try {
      setState((prev) => ({ ...prev, status: "syncing" }));

      // Trigger backend sync
      const res = await fetch("https://ixtwbkikyuexskdgfpfq.functions.supabase.co/fetch-fitbit-auto", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Sync failed");

      // Fire custom event for UI to auto-refresh
      window.dispatchEvent(new Event("fitbit_data_refreshed"));

      // ✅ Update status
      setState({
        status: "success",
        lastSync: new Date(),
      });

      setTimeout(() => setState((s) => ({ ...s, status: "idle" })), 3000);
    } catch (err) {
      console.error("❌ Fitbit sync error:", err);
      setState((prev) => ({ ...prev, status: "error" }));
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
