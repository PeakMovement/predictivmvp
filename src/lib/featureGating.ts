export type PlanTier = "free" | "pro" | "elite";

const TIER_ORDER: Record<PlanTier, number> = { free: 0, pro: 1, elite: 2 };

/**
 * MASTER SWITCH. While false, every FeatureGate renders its children for ALL
 * users regardless of tier — so shipping gating causes zero regression for
 * current (free) users. Flip to true once billing is live.
 * TODO(billing): set to true when Stripe checkout + webhook are configured.
 */
export const GATING_ENABLED = false;

/** Which minimum tier each premium feature requires. */
export const FEATURE_MIN_TIER = {
  advancedRiskDrivers: "pro",
  unlimitedHistory: "pro",
  projections: "pro",
  priorityPractitionerMatching: "elite",
} as const satisfies Record<string, PlanTier>;

export type PremiumFeature = keyof typeof FEATURE_MIN_TIER;

export function tierMeets(current: PlanTier, min: PlanTier): boolean {
  return TIER_ORDER[current] >= TIER_ORDER[min];
}

/** History window (days) per tier — used for the unlimitedHistory gate. */
export const HISTORY_DAYS: Record<PlanTier, number | null> = {
  free: 30,
  pro: null,   // null = unlimited
  elite: null,
};
