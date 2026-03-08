import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type GarminStatus = "active" | "token_expired" | "not_connected" | null;

export function useGarminTokenStatus() {
  const [status, setStatus] = useState<GarminStatus>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchStatus() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) { setStatus("not_connected"); setIsLoading(false); }
          return;
        }

        const { data } = await supabase
          .from("wearable_tokens")
          .select("status")
          .eq("user_id", user.id)
          .eq("scope", "garmin")
          .maybeSingle();

        if (mounted) {
          if (!data) {
            setStatus("not_connected");
          } else {
            setStatus((data.status as GarminStatus) ?? "active");
          }
          setIsLoading(false);
        }
      } catch {
        if (mounted) { setStatus(null); setIsLoading(false); }
      }
    }

    fetchStatus();

    // Listen for realtime changes so the banner dismisses automatically after reconnect
    const channel = supabase
      .channel("garmin_token_status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wearable_tokens" },
        () => { fetchStatus(); },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { status, isLoading, isExpired: status === "token_expired" };
}
