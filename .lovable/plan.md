

# Fix Fatigue Index Showing 100% -- Remaining Broken Formulas

## Problem

The last fix correctly updated the Fatigue Index formula in `RiskScoreCard.tsx` and the two backend edge functions, but the **same broken formula still exists in 3 other files**. Your Training page gauge and Your Plan page are still using the old calculation with uncapped monotony, which is why you're still seeing 100%.

## Files Still Using the Broken Formula

### 1. Training Page (`src/pages/Training.tsx`, line 223-228)
This is the **Fatigue Index gauge** you see on the Training page. It uses the old formula:
```text
(strain / 200) * 50 + (monotony / 3) * 50  -- no monotony cap
```

### 2. Your Plan Page (`src/pages/YourPlan.tsx`, line 601-604)
The Your Plan page calculates its own fatigue index for the metrics summary and PDF export, using the same broken formula.

### 3. Risk Drivers Library (`src/lib/riskDrivers.ts`, line 361-367)
A shared utility function `calculateFatigueIndex()` used by the risk driver identification engine on the frontend -- also uses the old formula with no monotony cap.

## Fix (Same Pattern Applied to All 3)

Each location will be updated to:
1. Cap monotony at 2.5
2. Use strain denominator of 300 (matching actual data range)
3. Use monotony denominator of 2.5 (matching the cap)

The corrected formula everywhere:
```text
cappedMonotony = min(monotony, 2.5)
fatigueIndex = min(100, round((strain / 300) * 50 + (cappedMonotony / 2.5) * 50))
```

## Expected Result

With your current data (strain ~266, monotony ~67 raw but capped to 2.5):
- Old result: 100% (permanently maxed)
- New result: ~94% (high but meaningful, will vary with actual training load changes)

## Technical Details

| File | Lines | Change |
|------|-------|--------|
| `src/pages/Training.tsx` | 223-228 | Cap monotony at 2.5, change denominators to 300 and 2.5 |
| `src/pages/YourPlan.tsx` | 601-604 | Cap monotony at 2.5, change denominators to 300 and 2.5 |
| `src/lib/riskDrivers.ts` | 361-367 | Cap monotony at 2.5, change denominators to 300 and 2.5 |

