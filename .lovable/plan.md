

# Add Google Calendar to the Weekly Planner

## What You'll Get

A new "Your Week Ahead" section on the Weekly Planner page that displays the next 7 days of your Google Calendar events in a clean, day-by-day container. If Google Calendar isn't connected yet, it shows a friendly prompt instead of breaking.

## Step 1: Connect Google Calendar

First, I'll need to link your Google Calendar account through Lovable's connector system. You'll see a one-click authorization prompt -- no API keys to manage. This makes your calendar credentials securely available to the backend.

## Step 2: Create the Backend (Edge Function)

**New file:** `supabase/functions/fetch-calendar-events/index.ts`

A secure edge function that:
- Authenticates the request (must be logged in)
- Checks for the required gateway credentials (`LOVABLE_API_KEY` and `GOOGLE_CALENDAR_API_KEY`)
- If either is missing, returns `{ events: [], connected: false }` gracefully -- no errors
- Calls the Google Calendar API through the Lovable gateway at `https://gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events`
- Fetches events for the next 7 days using `timeMin`, `timeMax`, `singleEvents=true`, `orderBy=startTime`
- Returns a clean array of events with: id, title, start time, end time, location, and description

**Config update:** Add `[functions.fetch-calendar-events]` with `verify_jwt = false` to `supabase/config.toml` (auth is handled in code, matching the existing pattern)

## Step 3: Create the Data Hook

**New file:** `src/hooks/useCalendarEvents.ts`

A React Query hook that:
- Calls the edge function via `supabase.functions.invoke('fetch-calendar-events')`
- Caches the result for 5 minutes
- Groups events by date (YYYY-MM-DD) for easy day-by-day rendering
- Returns: `events`, `eventsByDay`, `isLoading`, `error`, `isConnected`, `refresh`

## Step 4: Create the Calendar Component

**New file:** `src/components/planner/CalendarEventsSection.tsx`

A styled Card showing:
- **Header**: Calendar icon, "Your Week Ahead" title, and a refresh button
- **Connected state**: 7 day columns (stacked on mobile) with day name, date, and event list. Today's column gets a `ring-2 ring-primary/50` highlight. Empty days show "No events". Each event displays time and title, with optional location.
- **Not-connected state**: A friendly prompt -- "Connect your Google Calendar to see your upcoming events here"
- **Loading state**: Skeleton placeholders matching the 7-day grid

## Step 5: Register in Layout System

**Modified file:** `src/hooks/useLayoutCustomization.ts`

Add to the `plan` default sections:
```text
{ id: 'calendarEvents', name: 'Calendar', visible: true, order: 3 }
```
The existing `dailyBriefings` shifts to order 4. Users can show/hide/reorder this section using the existing layout customization controls.

## Step 6: Add to the Planner Page

**Modified file:** `src/pages/Planner.tsx`

Insert a new `LayoutBlock` between "Weekly Themes" and "Daily Briefings":
```text
<LayoutBlock blockId="calendarEvents" displayName="Calendar" pageId="plan" size="wide"
  visible={isSectionVisible('calendarEvents')}>
  <CalendarEventsSection />
</LayoutBlock>
```

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/fetch-calendar-events/index.ts` | Create -- edge function for Google Calendar API |
| `supabase/config.toml` | Modify -- add function config entry |
| `src/hooks/useCalendarEvents.ts` | Create -- React Query hook |
| `src/components/planner/CalendarEventsSection.tsx` | Create -- 7-day calendar display component |
| `src/hooks/useLayoutCustomization.ts` | Modify -- register `calendarEvents` in plan defaults |
| `src/pages/Planner.tsx` | Modify -- add CalendarEventsSection LayoutBlock |

## No-Calendar Fallback

If Google Calendar isn't connected, the section shows a friendly informational message. The rest of the Planner works exactly as before -- nothing breaks.

