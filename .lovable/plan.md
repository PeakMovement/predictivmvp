
# Fix: Daily Content Rotation + Remove Focus Mode

## Problem Analysis

### Issue 1: Content Not Changing Daily
The `TodaysBestDecision.tsx` component has **hardcoded text** for observations and meanings based on risk driver ID. Even though `src/lib/riskDrivers.ts` has a daily rotation system with:
- `getDateRotationIndex()` - deterministic daily index
- `WHY_TEXT_VARIATIONS` - multiple text variations per driver

The component doesn't use these - it has its own static text objects at lines 75-111.

### Issue 2: Focus Mode Section
User wants the entire Focus Mode feature removed from the Dashboard as it's not useful.

---

## Solution

### Part 1: Enable Daily Text Rotation

**File: `src/components/dashboard/TodaysBestDecision.tsx`**

1. Import rotation helpers:
```typescript
import { getDateRotationIndex, WHY_TEXT_VARIATIONS } from "@/lib/riskDrivers";
```

2. Create observation text variations (similar to existing WHY_TEXT_VARIATIONS):
```typescript
const OBSERVATION_VARIATIONS: Record<string, string[]> = {
  'monotony': [
    "Your recent training has followed a very similar pattern...",
    "You've been doing the same type of training consistently...",
    "Your workouts have been repetitive lately..."
  ],
  // ... variations for each driver
};
```

3. Update `generateObservationText()` to use rotation:
```typescript
const generateObservationText = () => {
  const driver = riskDrivers.primary.id;
  const variations = OBSERVATION_VARIATIONS[driver] || [];
  const index = getDateRotationIndex(variations.length);
  return variations[index] || defaultText;
};
```

4. Update `generateMeaningText()` to use `WHY_TEXT_VARIATIONS`:
```typescript
const generateMeaningText = () => {
  const driver = riskDrivers.primary.id;
  const variations = WHY_TEXT_VARIATIONS[driver] || [];
  const index = getDateRotationIndex(variations.length);
  return variations[index]?.injuryRiskReduction || defaultText;
};
```

### Part 2: Remove Focus Mode Section

**File: `src/pages/Dashboard.tsx`**

1. Remove imports:
   - `FocusModeSelector` (line 10)
   - `CustomFocusEditor` (line 11)
   - `useDashboardFocusMode` (line 21)

2. Remove hook usage (lines 72-87)

3. Remove `LayoutBlock` for Focus Mode (lines 203-220)

4. Remove Custom Focus Editor section (lines 222-231)

5. Remove focus mode references from other components:
   - Remove `isCardEmphasized`, `isCardMinimized`, `getCardOrder` usage
   - Remove `focusMode` prop from `DailyBriefingCard`

---

## Files Modified

| File | Changes |
|------|---------|
| `src/components/dashboard/TodaysBestDecision.tsx` | Add imports, create observation variations, update text generation functions |
| `src/pages/Dashboard.tsx` | Remove FocusModeSelector, CustomFocusEditor, and all focus mode logic |

---

## Technical Details

### New Observation Variations Structure

```typescript
const OBSERVATION_VARIATIONS: Record<string, string[]> = {
  'monotony': [
    "Your recent training has followed a very similar pattern, and your body is showing signs of accumulated fatigue. This is common during consistent training blocks and doesn't mean anything is wrong. It simply suggests that adding some variation today would support recovery.",
    "You've been training in a similar way for several days now. While consistency is valuable, your body responds best to varied stimuli. Today is a good opportunity to mix things up.",
    "Your workout patterns have been quite repetitive recently. This isn't a problem, but introducing some variety today will help your body continue adapting effectively."
  ],
  'acwr': [
    "Your training load has increased noticeably over the past week. Your body is adapting, but today is a good opportunity to give it a little extra support.",
    "You've ramped up your training recently, which is great for progress. Your system could use a lighter day to consolidate those gains.",
    "The intensity of your recent sessions has been higher than your usual baseline. A gentler approach today helps your body catch up."
  ],
  // Similar 3 variations for: strain, hrv, sleep, fatigue, symptoms
};
```

### Cache Invalidation
The existing cache in `useTodaysDecision.ts` already invalidates daily (line 56: `parsed.date === todayKey`), so the new text will appear each day when the cache refreshes.

### Testing Verification
After implementation:
- The observation and meaning text should differ day-to-day even if the same risk driver is identified
- Focus Mode selector should no longer appear on Dashboard
- All Dashboard functionality should remain intact without focus mode dependencies
