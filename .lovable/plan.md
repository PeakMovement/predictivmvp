
# Copy Refinement Plan: Today's Training Focus Card

## Overview
This plan updates text content only — no layout, spacing, or component changes. All refinements aim to make the copy sound more natural, supportive, and conversational.

---

## Changes Summary

### 1. Recommendation Text (Line 93)

**Current:**
```
A ${session.title.toLowerCase()} is recommended to help you stay active while supporting recovery.
```

**Updated:**
```
A ${session.title.toLowerCase()} is a good option today, allowing you to stay active while giving your body space to recover.
```

---

### 2. Duration & Effort Display (Lines 189-199)

**Current format:** Two separate badges showing duration and intensity

**Updated format:** Single inline sentence:
```
Around {duration} at {intensity level} ({RPE}).
```

Example output: "Around 25–35 minutes at an easy to comfortable effort (RPE 3–4/10)."

---

### 3. Meaning Text Function (Lines 102-110)

Update the `meanings` object to use the new conversational style:

| Driver | New Copy |
|--------|----------|
| monotony | "When training stays too similar for too long, the body can struggle to recover and adapt. Adding some variety helps reduce strain, supports long-term progress, and often keeps motivation high." |
| acwr | "Gradual load increases are essential, but the body needs time to adapt. By moderating today's intensity, you're giving your system time to strengthen—allowing you to handle more in the coming weeks." |
| strain | "Accumulated effort needs to be balanced with recovery. Today's lighter approach isn't a step backward—it's an investment in your capacity to train harder later." |
| hrv | "Recovery isn't just about rest—it's when your body actually gets stronger. By adjusting today's session to match your current state, you're maximizing the return on all the hard work you've already put in." |
| sleep | "Sleep quality directly affects how your body responds to training. Gentler movement on lower-recovery days can actually improve subsequent sleep while keeping you active." |
| fatigue | "Fatigue is your body's way of asking for a different stimulus. Responding appropriately today helps prevent the accumulated stress that leads to plateaus or setbacks." |
| symptoms | "Your body communicates through subtle signals that experienced coaches learn to respect. By acknowledging these today, you're building a more sustainable training practice." |

---

### 4. Data Disclosure CTA (Line 357)

**Current:**
```
See the data behind this decision
```

**Updated:**
```
See the data that informed this suggestion
```

(Also update the "Hide the data" text to "Hide data details" for consistency)

---

## Files Modified

| File | Change Type |
|------|-------------|
| `src/components/dashboard/TodaysBestDecision.tsx` | Copy refinements only |

---

## Technical Details

### Line-by-line edits:

1. **Line 93**: Update `generateRecommendationText()` return string
2. **Lines 189-199**: Consolidate duration/intensity into single sentence format
3. **Lines 102-110**: Update all entries in the `meanings` object
4. **Line 357**: Update data disclosure CTA text

### No changes to:
- Component structure or hierarchy
- Styling classes or spacing
- State management or logic
- Button labels (already updated to first-person style)
- "Would you like to see today's workout?" CTA (already good)
