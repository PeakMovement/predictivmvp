

# Two Enhancements to Today's Training Focus Card

## Change 1: "Why this matters" as Hover Tooltip

### Current Behavior
The "Why this matters to you" section is a permanently visible block (lines 404-429) taking up significant vertical space, with a nested collapsible for data details.

### New Behavior
Replace with an inline hover trigger -- a small "Why this matters?" text styled like the existing `InfoTooltip` pattern. When the user hovers (or taps on mobile), a tooltip appears showing the explanation text. It disappears when they stop hovering.

The nested "See the data that informed this suggestion" collapsible will be preserved -- it will move up to sit directly below the recommendation card instead.

### Implementation
- Import `Tooltip`, `TooltipContent`, `TooltipTrigger`, `TooltipProvider` from radix
- Remove the "Why this matters" card block (lines 404-429)
- Add a small "Why this matters?" hover trigger below the recommendation section, using the `HelpCircle` icon style
- Tooltip content shows the `generateMeaningText()` output
- Keep the "See the data" collapsible as a standalone element below

---

## Change 2: Download Exercises PDF Button

### What It Does
Adds a small "Download workout guide" button inside the expanded session details. When clicked, it generates and downloads a PDF containing:
- Session title and goal
- Duration and intensity target
- Warm-up activities
- All main exercises with sets/reps and coaching notes
- Cool-down activities
- Safety notes

### Implementation
- Use the already-installed `jspdf` library
- Add a `Download workout guide` button inside the expanded session area (after the safety notes, before the action buttons)
- The PDF is generated on-click from the current session data
- Clean, readable layout with exercise names, prescriptions, and notes
- No external images needed -- uses text-based formatting with clear section headers

---

## File Modified

| File | Changes |
|------|---------|
| `src/components/dashboard/TodaysBestDecision.tsx` | Replace meaning block with hover tooltip; add PDF download button in session details |

---

## Technical Details

### Tooltip Implementation (replacing lines 404-429)

```tsx
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { HelpCircle, Download } from "lucide-react";
import jsPDF from "jspdf";
```

The "Why this matters?" trigger will be placed as a subtle inline element:
```tsx
<div className="flex items-center gap-4 pt-1">
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Why this matters?</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[300px] p-3">
        <p className="text-xs leading-relaxed">{generateMeaningText()}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>

  {/* Data transparency collapsible stays as standalone */}
  <Collapsible ...>...</Collapsible>
</div>
```

### PDF Generation Function

```tsx
const handleDownloadPDF = () => {
  if (!session) return;
  const doc = new jsPDF();
  let y = 20;

  // Title
  doc.setFontSize(18);
  doc.text(session.title, 20, y);
  y += 10;

  // Duration & Intensity
  doc.setFontSize(11);
  doc.text(`Duration: ${session.duration}`, 20, y); y += 7;
  doc.text(`Intensity: ${session.intensity.level} (${session.intensity.rpe})`, 20, y); y += 7;
  if (session.intensity.hrZone) {
    doc.text(`Target zone: ${session.intensity.hrZone}`, 20, y); y += 7;
  }
  y += 5;

  // Warm-up, Main exercises, Cool-down, Safety notes...
  // Each section with headers and bullet points

  doc.save(`${session.title.replace(/\s+/g, '-').toLowerCase()}-workout.pdf`);
};
```

The download button will appear inside the expanded session details:
```tsx
<Button variant="outline" size="sm" onClick={handleDownloadPDF}>
  <Download className="h-3.5 w-3.5 mr-1.5" />
  Download workout guide
</Button>
```

### No Backend Changes
All changes are frontend-only. The session data already contains all exercise details needed for the PDF.

