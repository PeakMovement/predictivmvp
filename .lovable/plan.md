
# Fix: Monotony Alert Firing Incorrectly at 0% Above Normal

## The Problem

Two related bugs are causing the same monotony alert to appear every day with "0% above normal levels":

1. **Monotony is capped at 2.5** by the trend calculation engine (by design, to prevent runaway values). The alert threshold for "critical" monotony is also 2.5. The check uses `>=` (greater than or equal), so when monotony equals its own cap, the alert always fires -- even though being at the cap does not necessarily mean the user has a real problem.

2. **The percentage message shows 0%** because `(2.5 / 2.5 - 1) * 100 = 0`. So the user sees "Your monotony is 0% above normal levels," which is confusing and undermines trust.

3. **It never changes** because the capped monotony value is essentially static -- it sits at 2.5 most days, so the alert re-fires every 24 hours after cooldown expires.

## The Fix

### 1. Change the monotony threshold logic (`src/hooks/useRiskAlertTrigger.ts`)

- Change the monotony critical threshold from `2.5` to **strictly greater than** the cap, or more practically: **only alert when monotony is genuinely elevated above a meaningful threshold**.
- Since monotony is capped at 2.5, alerting at `>= 2.5` is pointless. Change the condition to use the `high` threshold (2.0) with a **strictly greater than** check, and only fire when the value meaningfully exceeds it.
- Updated thresholds:
  - `monotony.high`: 1.8 (warning-level, not used for popup alerts)
  - `monotony.critical`: 2.2 (must be **strictly exceeded**, i.e., `> 2.2`)
- This means capped-at-2.5 values will still trigger, but only when monotony is genuinely high (above 2.2), and the percentage will be meaningful (e.g., "14% above normal").

### 2. Require meaningful percentage above threshold

- Add a guard: if `percentAboveThreshold` is 0 or negative for any metric, skip the alert. A 0% deviation means the value is at baseline, not above it.
- This prevents confusing "0% above normal" messages for all metric types, not just monotony.

### 3. Use strict greater-than for all threshold checks

- Change all `>=` comparisons to `>` for critical thresholds. Being exactly at the threshold boundary should not trigger a critical alert.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useRiskAlertTrigger.ts` | Lower monotony critical to 2.2, change `>=` to `>` for all threshold checks, skip alerts where percentAboveThreshold is 0 or less |

## What This Means for You

- You will stop seeing the daily "Training Monotony Alert" with "0% above normal"
- Alerts will only appear when metrics are meaningfully above their thresholds
- The snooze and cooldown system continues to work as before
- No changes to the Today's Best Decision card or Daily Briefing -- those use separate logic
