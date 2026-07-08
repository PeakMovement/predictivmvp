import { ReactNode } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { GATING_ENABLED, tierMeets, type PlanTier } from "@/lib/featureGating";

interface FeatureGateProps {
  min: PlanTier;                 // minimum tier required
  children: ReactNode;
  fallback?: ReactNode;          // shown when locked (e.g. <UpgradeCard/>)
}

/**
 * Renders children only if the user's tier meets `min`. While GATING_ENABLED is
 * false, always renders children (dark-launch safe — no regression for free users).
 */
export function FeatureGate({ min, children, fallback = null }: FeatureGateProps) {
  const { tier, isLoading } = useSubscription();
  if (!GATING_ENABLED) return <>{children}</>;
  if (isLoading) return <>{children}</>;
  return tierMeets(tier, min) ? <>{children}</> : <>{fallback}</>;
}
