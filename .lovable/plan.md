

# Convert Sheets to Centered Modal Popups

## What Changes

Both the **Symptom Check-In** and **Yves AI** panels will switch from full-height side sheets that slide in from the right to **centered, contained modal popups** with:

- A comfortable rectangle that does not fill the entire screen
- Soft rounded corners (2xl border radius)
- A gentle backdrop blur behind the popup (instead of solid black overlay)
- Smooth scale-in/fade-in animation when opening

The floating trigger buttons on the right side of the screen stay exactly as they are.

---

## Visual Design

- **Size**: Max width ~lg (32rem / 512px), max height ~80vh so it sits comfortably mid-page with breathing room on all sides
- **Corners**: Rounded 2xl for soft edges
- **Backdrop**: Semi-transparent black overlay with a backdrop blur (e.g., `bg-black/40 backdrop-blur-sm`) so the rest of the page is softly obscured but not fully hidden
- **Shadow**: A subtle elevated shadow for depth
- **Animation**: Scale-in + fade-in on open, scale-out + fade-out on close (using the existing animation utilities)

---

## Technical Approach

Both components currently use the `Sheet` component (Radix Dialog under the hood, sliding panel). We will switch them to use the `Dialog` component instead, which renders a centered overlay modal.

### 1. Update the Dialog overlay (`src/components/ui/dialog.tsx`)

The current overlay uses `bg-black/80` (very dark). We will soften it to `bg-black/40 backdrop-blur-sm` for a lighter, blurred effect. We also need to add `rounded-2xl` to the content for soft edges.

Since the default Dialog overlay is shared across the app, and we don't want to break other uses of Dialog (like the professional help prompt in SymptomCheckInForm), we will pass the softer styling via className overrides on each component rather than changing the base dialog.

### 2. Convert `YvesChatSheet.tsx`

- Replace `Sheet`/`SheetContent`/`SheetHeader`/`SheetTitle`/`SheetTrigger` imports with `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle`/`DialogTrigger`
- Apply custom overlay class via the DialogContent className for soft blur + rounded corners
- Set max height to ~80vh with internal ScrollArea
- Keep the floating button trigger exactly as-is
- Keep the Tooltip wrapping the trigger

### 3. Convert `SymptomCheckInSheet.tsx`

- Same Sheet-to-Dialog swap
- Same soft styling (blur overlay, rounded corners, contained size)
- All existing logic stays intact: auto-close timer, AI interpretation display, symptom history, red-flag flow
- The inner professional help Dialog (from SymptomCheckInForm) will continue to work as a nested dialog

### 4. Update `DialogOverlay` in `dialog.tsx`

Add a minor tweak: reduce the default overlay opacity from `bg-black/80` to `bg-black/60` and add `backdrop-blur-sm` so all dialogs in the app get the softer treatment. This benefits both the new modals and the existing professional help prompt.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ui/dialog.tsx` | Soften overlay to `bg-black/60 backdrop-blur-sm` for a gentler blur effect across all dialogs |
| `src/components/YvesChatSheet.tsx` | Replace Sheet with Dialog, apply centered modal styling with rounded-2xl, max-w-lg, max-h-[80vh], ScrollArea inside |
| `src/components/symptoms/SymptomCheckInSheet.tsx` | Replace Sheet with Dialog, same centered modal styling, preserve all auto-close and interpretation logic |

No new files needed. The floating buttons and App.tsx integration remain unchanged.

