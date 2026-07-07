import { supabase } from "@/integrations/supabase/client";
import type { WearableProvider } from "@/hooks/useWearableConnections";

const ymd = (d: Date) => d.toISOString().split("T")[0];

/**
 * Pull historical wearable data on first connect so baselines/insights are
 * available immediately instead of after a multi-week wait.
 * Oura supports a full date range; Garmin is capped at 28d (API rate limits);
 * Polar returns whatever its transaction API exposes.
 */
export async function runBackfill(
  provider: WearableProvider,
  userId: string,
  days = 90,
): Promise<void> {
  const end = new Date();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  if (provider === "oura") {
    await supabase.functions.invoke("fetch-oura-data", {
      body: { user_id: userId, start_date: ymd(start), end_date: ymd(end) },
    });
  } else if (provider === "garmin") {
    await supabase.functions.invoke("fetch-garmin-data", {
      body: { user_id: userId, days: Math.min(days, 28) },
    });
  } else if (provider === "polar") {
    await Promise.allSettled([
      supabase.functions.invoke("fetch-polar-exercises", { body: { user_id: userId } }),
      supabase.functions.invoke("fetch-polar-sleep", { body: { user_id: userId } }),
    ]);
  }
}

const flagKey = (provider: WearableProvider, userId: string) =>
  `pv_backfill_done:${provider}:${userId}`;

export const hasBackfilled = (provider: WearableProvider, userId: string) => {
  try { return localStorage.getItem(flagKey(provider, userId)) === "1"; } catch { return false; }
};

export const markBackfilled = (provider: WearableProvider, userId: string) => {
  try { localStorage.setItem(flagKey(provider, userId), "1"); } catch { /* ignore */ }
};
