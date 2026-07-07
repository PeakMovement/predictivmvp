import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWearableConnections } from "@/hooks/useWearableConnections";
import { runBackfill, hasBackfilled, markBackfilled } from "@/lib/wearableBackfill";
import { useToast } from "@/hooks/use-toast";

/**
 * Watches wearable connections and, the first time a provider becomes active,
 * kicks off a one-time historical backfill so new users get instant baselines.
 * Idempotent per (user, provider) via localStorage.
 */
export function useWearableBackfill() {
  const { connected } = useWearableConnections();
  const { toast } = useToast();
  const inFlight = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (connected.length === 0) return;
    let cancelled = false;

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      for (const conn of connected) {
        const key = `${conn.provider}:${user.id}`;
        if (hasBackfilled(conn.provider, user.id) || inFlight.current.has(key)) continue;
        inFlight.current.add(key);
        markBackfilled(conn.provider, user.id); // mark up-front so it never double-fires
        toast({
          title: `Importing your ${conn.label} history`,
          description: "Pulling recent data so your baselines are ready sooner.",
        });
        runBackfill(conn.provider, user.id).catch(() => { /* best-effort */ });
      }
    })();

    return () => { cancelled = true; };
  }, [connected, toast]);
}
