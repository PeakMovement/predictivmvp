
# Dashboard Cleanup: Remove Sections & Add Info Tooltips

## Changes Summary

| Task | Action |
|------|--------|
| Remove "What we've learned about you" | Delete `LearnedPatternsSection` from DailyBriefingCard |
| Remove "Plan alignment" | Delete `PlanAlignmentSection` from DailyBriefingCard |
| Fix spacing under "Today's Best Decision" | Normalize padding/margins, remove inconsistent gaps |
| Add info tooltips | Create `InfoTooltip` component, replace subtitle text with `?` hover icons |
| "Attention Needed" diagnosis | Add diagnostic logging to show why riskHighlights may be empty |

---

## File Changes

### 1. Create `src/components/ui/info-tooltip.tsx` (NEW)

A reusable component that shows a small `?` icon which reveals explanatory text on hover:

```tsx
// Props: content (the text to show on hover)
// Usage: <InfoTooltip content="Your personalised guidance based on your data" />
// Renders: Small muted ? icon with tooltip on hover
```

### 2. Update `src/components/dashboard/DailyBriefingCard.tsx`

**Remove imports:**
- `LearnedPatternsSection` (line 12)
- `PlanAlignmentSection` (line 14)

**Remove JSX:**
- Line 145: `<LearnedPatternsSection className="pb-2 border-b border-border/50" />`
- Line 151: `<PlanAlignmentSection className="pb-2 border-b border-border/50" />`

**Update CollapsibleSection:**
- Add optional `tooltip` prop
- When `tooltip` is provided, show `InfoTooltip` instead of preview text

### 3. Update `src/components/dashboard/TodaysBestDecision.tsx`

**Fix spacing:**
- Line 108: Change `<div className="px-4 pb-4 space-y-4">` to `space-y-3` for tighter spacing
- Line 356: Remove `pt-2` from CTA buttons div (line 356)

**Replace subtitle text with tooltips:**

| Current | New |
|---------|-----|
| `<p className="text-xs">Your personalised guidance</p>` | `<InfoTooltip content="..." />` |
| `<span className="text-sm font-semibold">Risk Driver</span>` | Add `<InfoTooltip />` next to title |
| "Why this matters" section labels | Add `<InfoTooltip />` icons |

**Specific changes:**
- Line 86-87: Replace subtitle `<p>` with inline `<InfoTooltip content="Personalised recommendations based on your current metrics and profile" />`
- Line 132: Add tooltip after "Risk Driver" label explaining what a risk driver is
- Lines 325, 336, 347: Add tooltips for "What triggered this", "How this protects you", "Your benefit today"

### 4. Update `src/components/dashboard/OneThingThatMatters.tsx`

- Line 93-95: Add `InfoTooltip` next to the heading "One thing that matters today"

---

## Tooltip Content Examples

| Section | Tooltip Text |
|---------|-------------|
| Today's Best Decision | "Personalised recommendation based on your current metrics, risk level, and recovery state" |
| Risk Driver | "The primary factor influencing today's recommendation, identified from your wearable data" |
| What triggered this | "The specific metric or pattern that initiated this recommendation" |
| How this protects you | "How following this guidance helps reduce injury risk" |
| Your benefit today | "The immediate positive outcome you can expect from this session" |
| One thing that matters | "Your single most important focus for today based on all available data" |

---

## Visual Change

**Before:**
```
Today's Best Decision
Your personalised guidance
```

**After:**
```
Today's Best Decision [?]
```
*Hovering `?` shows: "Personalised recommendation based on your current metrics..."*

---

## "Attention Needed" Section Analysis

The `riskHighlights` array is populated by the edge function based on:
1. Layer 2 risk trajectory evaluation
2. Critical deviations (>15% from baseline)
3. Recent symptom correlations
4. Health anomalies with severity="high"

**Why it may appear empty:**
- Signals classified as "noise" (single-day spike without pattern)
- Risk accumulation score < 25 (considered "low")
- No symptoms reported in last 3 days
- No critical deviations detected

**Fix:** The edge function will continue to only show warnings when there's meaningful risk. This is intentional - "Silence is valid" when there's nothing to report. The section will automatically populate when genuine concerns exist.

---

## Technical Details

### InfoTooltip Component Structure
```tsx
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 
          hover:text-muted-foreground cursor-help inline-block ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[250px]">
        <p className="text-xs">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}
```

### Files Modified
1. `src/components/ui/info-tooltip.tsx` - NEW
2. `src/components/dashboard/DailyBriefingCard.tsx` - Remove 2 sections
3. `src/components/dashboard/TodaysBestDecision.tsx` - Fix spacing + add tooltips
4. `src/components/dashboard/OneThingThatMatters.tsx` - Add tooltip
