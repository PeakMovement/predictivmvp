import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { functionUrl } from "@/lib/supabaseConfig";

export type WearableProvider = "oura" | "garmin" | "polar";
export type WearableState = "active" | "expired" | "disconnected";

export interface WearableConnection {
  provider: WearableProvider;
  label: string;
  state: WearableState;
  reconnect: () => void | Promise<void>;
}

const LABELS: Record<WearableProvider, string> = {
  oura: "Oura Ring",
  garmin: "Garmin",
  polar: "Polar",
};

function navigateTop(url: string) {
  try {
    if (window.top && window.top !== window) window.top.location.href = url;
    else window.location.href = url;
  } catch {
    window.location.href = url;
  }
}

async function reconnectGarmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  navigateTop(`${functionUrl("garmin-auth")}?userId=${encodeURIComponent(user.id)}`);
}

async function reconnectOura() {
  const { data, error } = await supabase.functions.invoke("oura-auth-initiate", { body: {} });
  const url = (data as { auth_url?: string } | null)?.auth_url;
  if (!error && url) navigateTop(url);
}

async function reconnectPolar() {
  const { data, error } = await supabase.functions.invoke("polar-auth-initiate");
  const url = (data as { auth_url?: string } | null)?.auth_url;
  if (!error && url) navigateTop(url);
}

const RECONNECT: Record<WearableProvider, () => void | Promise<void>> = {
  oura: reconnectOura,
  garmin: reconnectGarmin,
  polar: reconnectPolar,
};

const isPast = (ts: string | null | undefined) =>
  !!ts && new Date(ts).getTime() <= Date.now();

/**
 * Unified view of all wearable connections (Oura / Garmin / Polar) with a
 * per-provider state and a one-tap reconnect action. Replaces the fragmented,
 * per-device status hooks so expired tokens surface in one place.
 */
export function useWearableConnections() {
  const [connections, setConnections] = useState<WearableConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConnections([]);
        setIsLoading(false);
        return;
      }

      // wearable_tokens holds oura (scope contains "extapi"/"oura") + garmin rows
      const { data: wtRows } = await supabase
        .from("wearable_tokens")
        .select("scope, status, expires_at")
        .eq("user_id", user.id);

      const rows = (wtRows ?? []) as Array<{ scope: string | null; status: string | null; expires_at: string | null }>;
      const garmin = rows.find((r) => (r.scope ?? "").toLowerCase().includes("garmin"));
      const ouraRow = rows.find((r) => {
        const s = (r.scope ?? "").toLowerCase();
        return s.includes("extapi") || s.includes("oura");
      });

      // Legacy / secondary token tables
      const [{ data: ouraLegacy }, { data: polar }] = await Promise.all([
        supabase.from("oura_tokens" as never).select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("polar_tokens").select("user_id").eq("user_id", user.id).maybeSingle(),
      ]);

      const stateFor = (
        exists: boolean,
        status?: string | null,
        expiresAt?: string | null,
      ): WearableState => {
        if (!exists) return "disconnected";
        if (status === "token_expired" || isPast(expiresAt)) return "expired";
        return "active";
      };

      const next: WearableConnection[] = [
        {
          provider: "oura",
          label: LABELS.oura,
          state: stateFor(!!ouraRow || !!ouraLegacy, ouraRow?.status, ouraRow?.expires_at),
          reconnect: RECONNECT.oura,
        },
        {
          provider: "garmin",
          label: LABELS.garmin,
          state: stateFor(!!garmin, garmin?.status, garmin?.expires_at),
          reconnect: RECONNECT.garmin,
        },
        {
          provider: "polar",
          label: LABELS.polar,
          state: stateFor(!!polar, null, null),
          reconnect: RECONNECT.polar,
        },
      ];

      setConnections(next);
      setIsLoading(false);
    } catch {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("wearable_connections")
      .on("postgres_changes", { event: "*", schema: "public", table: "wearable_tokens" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refresh]);

  const expired = connections.filter((c) => c.state === "expired");
  const connected = connections.filter((c) => c.state === "active");

  return { connections, expired, connected, isLoading, refresh };
}
