
# Replace "Day by Day" with Google Calendar Connection Box

## What Changes

The existing "Daily Briefings" section (the 7-card day-by-day grid) on the Planner page will be replaced with a clean, inviting empty-state container that prompts the user to connect their Google Calendar. This is a UX-only change — no backend wiring yet.

## What It Will Look Like

A centered Card with:
- A Google Calendar icon (using the Lucide `CalendarDays` icon)
- A heading: "Your Week Ahead"
- A brief description explaining the benefit of connecting
- A prominent "Connect Google Calendar" button
- A subtle footer note: "Your events will appear here once connected"

The card will follow the same design system as the rest of the Planner — using theme tokens, the primary accent, and matching the existing card/border styles.

## Technical Details

### File: `src/pages/Planner.tsx`

**Remove**: The `DayCard` component (lines 34-89) and `today` variable — they are no longer used.

**Replace**: The `dailyBriefings` LayoutBlock content (lines 379-401). Instead of the day-by-day grid, it renders a new `CalendarConnectPlaceholder` component defined inline (or could be extracted).

The new block content:

```text
<Card className="p-8 border border-border/50">
  <div className="flex flex-col items-center text-center space-y-4">
    <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
      <CalendarDays icon />
    </div>
    <h3 className="text-lg font-semibold text-foreground">Your Week Ahead</h3>
    <p className="text-sm text-muted-foreground max-w-md">
      Connect your Google Calendar to see your upcoming events, meetings,
      and schedule right here alongside your weekly plan.
    </p>
    <Button className="gap-2">
      <CalendarDays icon /> Connect Google Calendar
    </Button>
    <p className="text-xs text-muted-foreground">
      Your events will appear here once connected
    </p>
  </div>
</Card>
```

**Update the LayoutBlock**: Change `blockId` from `"dailyBriefings"` to `"calendarEvents"` and `displayName` to `"Calendar"` so it's ready for the future integration.

### File: `src/hooks/useLayoutCustomization.ts`

Update the `plan` default sections to rename the last entry:

```text
Before: { id: 'dailyBriefings', name: 'Daily Briefings', visible: true, order: 3 }
After:  { id: 'calendarEvents', name: 'Calendar', visible: true, order: 3 }
```

### File: `src/pages/Planner.tsx` (import cleanup)

- Add `CalendarDays` to the Lucide import
- Remove the unused `today` const (the `format` import stays since it's used in the header)

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Planner.tsx` | Remove `DayCard` component and `today` variable; replace daily briefings LayoutBlock with calendar connect placeholder; add `CalendarDays` import |
| `src/hooks/useLayoutCustomization.ts` | Rename `dailyBriefings` to `calendarEvents` in the `plan` default layout |

## What Won't Change

- The rest of the Planner page (Week Intent, Weekly Focus, Themes) remains untouched
- Dark/light mode styling is unchanged — the new card uses theme tokens
- Layout customization system continues to work (users can hide/reorder this section)
- No backend or edge function changes
