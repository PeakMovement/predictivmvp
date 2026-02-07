
# Risk Score Deep Audit and Fix Plan

## Current Architecture

The Risk Score flows through this pipeline:

1. **Raw data** -- `wearable_sessions` table stores daily `activity_score` (0-100 from Oura)
2. **Backend calculation** -- `calculate-oura-trends` edge function computes ACWR, Monotony, and Strain daily and writes to `recovery_trends`
3. **Frontend display** -- `RiskScoreCard` component reads last 7 days from `recovery_trends`, averages them, calculates Fatigue Index and Risk Score

---

## Bugs Found

### Bug 1: Monotony stored uncapped in the database (ROOT CAUSE)

The architecture specification says Monotony should be capped at 2.5. The backend (`calculate-oura-trends`, line 266) caps it at 3 **only for the Strain calculation**, but saves the **raw uncapped** value to `recovery_trends`:

```text
Actual DB values for last 7 days:
  Feb 7: monotony = 67.37   (should be capped at 2.5)
  Feb 6: monotony = 2.45    (fine)
  Feb 5: monotony = 2.45    (fine)
  Feb 4: monotony = 36.39   (should be capped at 2.5)
  Feb 3: monotony = 36.39   (should be capped at 2.5)
  Feb 2: monotony = 36.39   (should be capped at 2.5)
  Feb 1: monotony = 36.39   (should be capped at 2.5)
```

Why so high? Your activity scores are very consistent (95-100 daily), so the standard deviation is tiny (~1.46). Monotony = Mean / StdDev = 98.14 / 1.46 = **67.37**. The formula is working correctly, it is just not being capped before storage.

### Bug 2: Fatigue Index permanently stuck at 100%

The frontend Fatigue Index formula:
```text
Fatigue = min(100, (avgStrain / 200) x 50 + (avgMonotony / 3) x 50)
```

With uncapped monotony averaging ~31.1 across 7 days, the monotony term alone produces (31.1 / 3) x 50 = **518** -- far exceeding the 100 cap before strain even contributes. This means Fatigue will always show 100% regardless of actual fatigue state.

### Bug 3: ACWR contributing factor color logic is reversed

In the contributing factors display (line 187), the ternary check order prevents red from ever showing:
```text
Current:  acwr > 1.3 ? yellow : acwr > 1.5 ? red : default
Problem:  Any value > 1.5 is also > 1.3, so yellow always wins
Fix:      acwr > 1.5 ? red : acwr > 1.3 ? yellow : default
```

### Bug 4: Same Fatigue formula bug exists in `identify-risk-drivers`

The backend `identify-risk-drivers` edge function (line 67-71) uses the identical flawed Fatigue Index formula, meaning all risk driver analysis downstream is also affected.

---

## How the Score of 70 Is Calculated Today

Walking through the current formula with your live data:

```text
Step 1 -- Average 7 days of recovery_trends:
  avgACWR     = 1.05   (range: 0.90 - 1.21)
  avgStrain   = 266    (range: 207 - 294)
  avgMonotony = 31.12  (range: 2.45 - 67.37)  <-- BROKEN

Step 2 -- Fatigue Index:
  = min(100, round((266/200) x 50 + (31.12/3) x 50))
  = min(100, round(66.5 + 518.7))
  = 100%  <-- Always maxed due to uncapped monotony

Step 3 -- Risk Score (bracket scoring):
  ACWR 1.05  > 1.0  --> +10 points
  Strain 266 > 150  --> +30 points
  Fatigue 100 > 70  --> +30 points
  Total = 70 (High)
```

---

## Proposed Fixes

### Fix 1: Cap Monotony in the backend before storage

In `calculate-oura-trends` (line 285), cap monotony at 2.5 per the architecture spec before writing to `recovery_trends`:

```text
Before: monotony: safeNumber(monotony),
After:  monotony: safeNumber(monotony !== null ? Math.min(monotony, 2.5) : null),
```

Also apply the same cap when writing to `training_trends` (line 309).

### Fix 2: Defensive cap in the frontend Fatigue Index formula

Even after the backend fix, add a safety cap in `RiskScoreCard` so the formula works correctly with any existing uncapped data:

```text
const cappedMonotony = Math.min(avgMonotony, 2.5);
const fatigueIndex = Math.min(100, Math.round(
  (avgStrain / 300) * 50 + (cappedMonotony / 2.5) * 50
));
```

Note the strain denominator change from 200 to 300 -- the actual daily strain values from the backend range from 200-294 (because `weeklyLoad x cappedMonotony / 7` with activity scores near 100 produces ~294 max). Using 300 as the denominator normalizes this correctly.

### Fix 3: Fix the ACWR color ternary in contributing factors

```text
Before: metrics.acwr > 1.3 ? "text-yellow-400" : metrics.acwr > 1.5 ? "text-red-400" : ...
After:  metrics.acwr > 1.5 ? "text-red-400" : metrics.acwr > 1.3 ? "text-yellow-400" : ...
```

### Fix 4: Fix the same Fatigue formula in `identify-risk-drivers`

Update the `calculateFatigueIndex` function (line 67-71) to use the same corrected formula with capped inputs.

---

## What the Score Will Look Like After Fixes

```text
With corrected formula:
  avgACWR     = 1.05   (unchanged)
  avgStrain   = 266    (unchanged)
  avgMonotony = 2.5    (capped)

  Fatigue Index:
  = min(100, round((266/300) x 50 + (2.5/2.5) x 50))
  = min(100, round(44.3 + 50))
  = 94%  <-- High but not permanently maxed

  Risk Score:
  ACWR 1.05  > 1.0   --> +10
  Strain 266 > 150   --> +30
  Fatigue 94 > 70    --> +30
  Total = 70 (High)
```

The Risk Score remains 70 because strain and fatigue are still legitimately elevated -- your activity scores are 95-100 every day with no rest days. This is genuinely a high-fatigue training pattern. However, the **Fatigue Index will now show meaningful variation** instead of being permanently locked at 100%.

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/calculate-oura-trends/index.ts` | Cap monotony at 2.5 before writing to recovery_trends and training_trends |
| `src/components/dashboard/RiskScoreCard.tsx` | Cap monotony in Fatigue formula, fix strain denominator, fix ACWR color logic |
| `supabase/functions/identify-risk-drivers/index.ts` | Fix calculateFatigueIndex to cap monotony and use correct strain denominator |

