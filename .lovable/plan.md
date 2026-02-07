

# Finish Google Calendar Integration for Weekly Planner

## Current State

Nothing from the approved plan has been built yet:
- No edge function (`fetch-calendar-events`) exists
- No hook (`useCalendarEvents`) exists
- No component (`CalendarEventsSection`) exists
- The Planner page and layout config haven't been updated
- The Google Calendar connector has **not been linked** -- there is no `GOOGLE_CALENDAR_API_KEY` secret configured

## Step 1: Connect Google Calendar

Before any code will work, we need to link the Google Calendar connector to the project. I'll prompt you to authorize the connection through Lovable's connector system -- it's a one-click flow, no API keys to manage manually.

## Step 2: Create the Edge Function

**New file:** `supabase/functions/fetch-calendar-events/index.ts`

A Deno edge function that:
- Checks for `LOVABLE_API_KEY` and `GOOGLE_CALENDAR_API_KEY` environment variables
- If either is missing, returns `{ events: [], connected: false }` gracefully
- Authenticates the calling user via the Authorization header
- Calls `GET /calendars/primary/events` through the Lovable gateway at `https://gateway.lovable.dev/google_calendar/calendar/v3`
- Passes `timeMin` (now) and `timeMax` (now + 7 days), `singleEvents=true`, `orderBy=startTime`
- Returns a clean array of events with id, title, start, end, location, and description

**Config update:** `supabase/config.toml` -- add `[functions.fetch-calendar-events]` with `verify_jwt = false` (auth handled in code)

## Step 3: Create the React Query Hook

**New file:** `src/hooks/useCalendarEvents.ts`

- Calls the edge function via `supabase.functions.invoke('fetch-calendar-events')`
- Caches for 5 minutes with React Query
- Groups events by date string (YYYY-MM-DD) for easy day-by-day rendering
- Returns: `events`, `eventsByDay`, `isLoading`, `error`, `isConnected`, `refresh`

## Step 4: Create the Calendar Component

**New file:** `src/components/planner/CalendarEventsSection.tsx`

A styled Card showing:
- Header with calendar icon, "Your Week Ahead" title, and a refresh button
- **Connected state**: 7 day columns (stacked on mobile) with day name, date, and event list per day. Today's column gets a `ring-2 ring-primary/50` highlight. Empty days show "No events" in muted text. Each event shows formatted time and title.
- **Not-connected state**: A friendly prompt "Connect your Google Calendar to see your upcoming events here" -- purely informational since the connection is managed at the workspace level.
- **Loading state**: Skeleton placeholders matching the 7-day grid

Uses existing `Card`, `Badge`, `Skeleton`, and `Button` components.

## Step 5: Register in Layout System

**Modified file:** `src/hooks/useLayoutCustomization.ts`

Add to the `plan` default sections array:
```
{ id: 'calendarEvents', name: 'Calendar', visible: true, order: 3 }
```
Shift `dailyBriefings` to order 4.

## Step 6: Add to Planner Page

**Modified file:** `src/pages/Planner.tsx`

- Import `CalendarEventsSection`
- Insert a new `LayoutBlock` between the "Weekly Themes" and "Daily Briefings" blocks:

```
LayoutBlock blockId="calendarEvents" displayName="Calendar" pageId="plan" size="wide"
  visible={isSectionVisible('calendarEvents')}
```

Users can show/hide/reorder it using the existing layout customization controls.

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/fetch-calendar-events/index.ts` | Create -- edge function for Google Calendar API |
| `supabase/config.toml` | Modify -- add function config entry |
| `src/hooks/useCalendarEvents.ts` | Create -- React Query hook |
| `src/components/planner/CalendarEventsSection.tsx` | Create -- 7-day calendar display component |
| `src/hooks/useLayoutCustomization.ts` | Modify -- register `calendarEvents` block |
| `src/pages/Planner.tsx` | Modify -- add CalendarEventsSection LayoutBlock |

## No-Calendar Fallback

If the connector isn't linked or credentials are missing, the section shows a friendly informational message instead of breaking. The rest of the Planner works exactly as before.

