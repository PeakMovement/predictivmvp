import React, { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@supabase/supabase-js";

// If you already have a shared client, replace with: import { supabase } from "@/lib/supabaseClient";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type LastSyncState = {
  isSyncing: boolean;
  lastSync: Date | null;
  error?: string | null;
};

export default function FitbitSyncStatus() {
  const [{ isSyncing, lastSync, error }, setState] = useState<LastSyncState>({
    isSyncing: false,
    lastSync: null,
    error: null,
  });

  const setIsSyncing = (b: boolean) => setState((s) => ({ ...s, isSyncing: b, error: b ? null : s.error }));
  const setLastSync = (d: Date | null) => setState((s) => ({ ...s, lastSync: d }));
  const setError = (e: string | null) => setState((s) => ({ ...s, error: e }));

  const fetchLastSync = useCallback(async () => {
    setError(null);
    // 1) Prefer precise ingestion timestamp
    const { data: auto, error: autoErr } = await supabase
      .from("fitbit_auto_data")
      .select("fetched_at")
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (!autoErr && auto?.fetched_at) {
      const ts = new Date(auto.fetched_at);
      setLastSync(ts);
      // Persist for Settings page (optional but nice)
      try {
        localStorage.setItem("fitbit-last-sync", ts.toISOString());
      } catch (_e) {}
      return;
    }

    // 2) Fallback to latest trend "date" (daily granularity)
    const { data: trend, error: trendErr } = await supabase
      .from("fitbit_trends")
      .select("date")
      .order("date", { ascending: false })
      .limit(1)
      .single();

    if (!trendErr && trend?.date) {
      const ts = new Date(trend.date);
      setLastSync(ts);
      try {
        localStorage.setItem("fitbit-last-sync", ts.toISOString());
      } catch (_e) {}
      return;
    }

    // No data at all
    setLastSync(null);
  }, []);

  useEffect(() => {
    fetchLastSync();
  }, [fetchLastSync]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    try {
      // Use env-aware Supabase Functions client (no hard-coded URL)
      const { error } = await supabase.functions.invoke("fetch-fitbit-auto", {
        body: {},
      });
      if (error) throw error;

      // Recompute last sync and broadcast a single, unified event
      await fetchLastSync();
      window.dispatchEvent(new Event("fitbit_trends_refresh"));
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? "Failed to trigger sync");
    } finally {
      setIsSyncing(false);
    }
  }, [fetchLastSync]);

  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-medium">Fitbit data</div>
          <div className="text-sm text-gray-500">
            {lastSync ? `Updated ${formatDistanceToNow(lastSync, { addSuffix: true })}` : "Not synced yet"}
          </div>
          {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`px-3 py-2 rounded-xl text-sm font-medium ${
            isSyncing ? "bg-gray-200 text-gray-600 cursor-not-allowed" : "bg-black text-white hover:bg-gray-900"
          }`}
          aria-busy={isSyncing}
          aria-disabled={isSyncing}
        >
          {isSyncing ? "Updating…" : "Update now"}
        </button>
      </div>
    </div>
  );
}
