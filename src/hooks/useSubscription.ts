import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PlanTier } from "@/lib/featureGating";

export interface Subscription {
  tier: PlanTier;
  status: string;
  isPro: boolean;
  isElite: boolean;
  isLoading: boolean;
}

/** Reads the user's subscription tier. Everyone defaults to 'free'. */
export function useSubscription(): Subscription {
  const [tier, setTier] = useState<PlanTier>("free");
  const [status, setStatus] = useState<string>("active");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (!cancelled) setIsLoading(false); return; }
      // user_subscriptions not yet in generated types — cast through any.
      const { data } = await (supabase.from as unknown as (t: string) => {
        select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { tier?: PlanTier; status?: string } | null }> } };
      })("user_subscriptions")
        .select("tier, status")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setTier((data?.tier as PlanTier) ?? "free");
      setStatus(data?.status ?? "active");
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return { tier, status, isPro: tier === "pro" || tier === "elite", isElite: tier === "elite", isLoading };
}
