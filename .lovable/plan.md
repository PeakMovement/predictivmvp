

# Apply Tooltip + PDF Features to Yves Recommendations

## What Changes

Apply the same two enhancements from the "Today's Training Focus" card to each recommendation item in the Yves Recommendations card:

1. **"Why this matters?" hover tooltip** -- Replace the static "Why this matters" block (lines 231-239) with a compact hover trigger, matching the pattern used in TodaysBestDecision
2. **"Download recommendation" PDF button** -- Add a small button that generates a PDF containing the recommendation text, category, priority, and reasoning

---

## Changes to `src/components/dashboard/YvesRecommendationsCard.tsx`

### New Imports (line 5-6)
- Add `HelpCircle`, `Download` to lucide imports
- Add `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TooltipProvider` from radix
- Add `jsPDF` from jspdf

### RecommendationItem Component Changes (lines 231-239)

**Before:**
The "Why this matters" reasoning is shown as a permanently visible muted block taking up vertical space inside each expanded recommendation.

**After:**
- Replace the static reasoning block with a "Why this matters?" hover trigger using `TooltipProvider` + `Tooltip` + `TooltipTrigger` + `TooltipContent`
- The trigger uses a `HelpCircle` icon and text, styled identically to the one in TodaysBestDecision
- Reasoning text appears only on hover/tap in a max-width tooltip

### PDF Download Button (added after tooltip, before feedback)

Add a `handleDownloadPDF` function to `RecommendationItem` that generates a simple PDF containing:
- Recommendation category and priority
- The recommendation text
- The "Why this matters" reasoning
- Date generated

A small "Download as PDF" button will appear in the expanded content area, between the tooltip row and the feedback buttons.

---

## Final Expanded Recommendation Layout

```
[Category Icon] [Category Label] [Priority Badge]
  Preview text...

--- Expanded ---
Main suggestion text

[HelpCircle] Why this matters?  |  [Download] Download as PDF

Was this helpful?  [Yes] [No]      [I did this]
```

---

## Technical Details

### Tooltip (replacing lines 231-239)

```tsx
{recommendation.reasoning && (
  <div className="flex items-center gap-4">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Why this matters?</span>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-[300px] p-3">
          <p className="text-xs leading-relaxed">{recommendation.reasoning}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleDownloadPDF}>
      <Download className="h-3 w-3 mr-1" /> Download as PDF
    </Button>
  </div>
)}
```

### PDF Generation

```tsx
const handleDownloadPDF = (e: React.MouseEvent) => {
  e.stopPropagation();
  const doc = new jsPDF();
  let y = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`${categoryIcon} ${categoryLabel}`, 20, y); y += 10;

  // Priority
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Priority: ${recommendation.priority}`, 20, y); y += 10;

  // Recommendation text
  doc.setFont("helvetica", "bold");
  doc.text("Recommendation", 20, y); y += 7;
  doc.setFont("helvetica", "normal");
  const textLines = doc.splitTextToSize(recommendation.text, 170);
  doc.text(textLines, 20, y); y += textLines.length * 6 + 6;

  // Why this matters
  if (recommendation.reasoning) {
    doc.setFont("helvetica", "bold");
    doc.text("Why This Matters", 20, y); y += 7;
    doc.setFont("helvetica", "normal");
    const reasonLines = doc.splitTextToSize(recommendation.reasoning, 170);
    doc.text(reasonLines, 20, y); y += reasonLines.length * 6 + 6;
  }

  // Date
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);

  doc.save(`yves-${recommendation.category}-recommendation.pdf`);
};
```

---

## File Modified

| File | Changes |
|------|---------|
| `src/components/dashboard/YvesRecommendationsCard.tsx` | Replace static reasoning block with hover tooltip; add PDF download button per recommendation |

No backend changes. No logic changes to engagement tracking or feedback system.

