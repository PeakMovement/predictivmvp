
# Add Google Calendar Integration to Weekly Planner

## Overview

Add a new section to the Weekly Planner page that shows the user's next 7 days of Google Calendar events in a clean, scrollable container. This requires connecting the Google Calendar service, creating a backend edge function to fetch events, and building a frontend component to display them.

## Setup Required: Google Calendar Connection

Before the code can work, you'll need to connect your Google Calendar. When I implement this, I'll prompt you to link your Google account through the Lovable connector system -- it's a one-click authorization flow, no API keys to manage manually.

## Architecture

```text
+------------------+       +-------------------------+       +---------------------------+
|  Planner Page    | ----> |  fetch-calendar-events  | ----> |  Google Calendar API      |
|  (new component) |       |  (edge function)        |       |  via Lovable Gateway      |
+------------------+       +-------------------------+       +---------------------------+
```

The edge function acts as a secure proxy -- your Google credentials never touch the browser.

## What Gets Built

### 1. Edge Function: `fetch-calendar-events`

A new Supabase edge function that:
- Authenticates the request (requires logged-in user)
- Calls the Google Calendar API through the Lovable gateway
- Fetches events for the next 7 days from the user's primary calendar
- Returns a clean list of events with title, start/end times, location, and description

### 2. Frontend Hook: `useCalendarEvents`

A React Query hook that:
- Calls the edge function on mount
- Caches the result for 5 minutes
- Returns loading, error, and events states
- Groups events by day for easy rendering

### 3. Component: `CalendarEventsSection`

A styled card that shows:
- A header with a calendar icon and "Your Week Ahead" title
- A "Connect Google Calendar" prompt if not connected (graceful fallback)
- 7 day columns (or stacked cards on mobile) showing events grouped by date
- Each event shows: time, title, and optionally location
- Today's column highlighted with the same ring style used elsewhere
- Empty days show "No events" in muted text
- A refresh button in the header

### 4. Planner Page Integration

- Add the new section as a `LayoutBlock` with id `calendarEvents` and display name "Calendar"
- Position it after the "Weekly Themes" block and before "Daily Briefings"
- Register it in the layout customization defaults so users can show/hide/reorder it

---

## Technical Details

### Edge Function: `supabase/functions/fetch-calendar-events/index.ts`

```ts
const GATEWAY_URL = 'https://gateway.lovable.dev/google_calendar/calendar/v3';

// Uses LOVABLE_API_KEY and GOOGLE_CALENDAR_API_KEY env vars
// Fetches: GET /calendars/primary/events
// Query params: timeMin (now), timeMax (now + 7 days), singleEvents=true, orderBy=startTime
// Returns: { events: CalendarEvent[], connected: true }
// On 401/missing keys: Returns { events: [], connected: false }
```

### Hook: `src/hooks/useCalendarEvents.ts`

```ts
// Calls the edge function via supabase.functions.invoke('fetch-calendar-events')
// Groups events by date string (YYYY-MM-DD)
// Returns: { events, eventsByDay, isLoading, error, isConnected, refresh }
```

### Component: `src/components/planner/CalendarEventsSection.tsx`

- Renders a Card with a 7-day grid
- Each day column shows: day name, date, and list of events
- Events display time (formatted) and title
- Uses existing Card, Badge, and Skeleton components
- Graceful "not connected" state with a button to trigger connection

### Layout Registration: `src/hooks/useLayoutCustomization.ts`

Add to the `plan` default sections:
```ts
{ id: 'calendarEvents', name: 'Calendar', visible: true, order: 4 }
```
(Shifts dailyBriefings to order 5)

### Planner Page: `src/pages/Planner.tsx`

Add new LayoutBlock between themes and daily briefings:
```tsx
<LayoutBlock blockId="calendarEvents" displayName="Calendar" pageId="plan" size="wide"
  visible={isSectionVisible('calendarEvents')}>
  <CalendarEventsSection />
</LayoutBlock>
```

---

## Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/fetch-calendar-events/index.ts` | Edge function to fetch Google Calendar events |
| `src/hooks/useCalendarEvents.ts` | React Query hook for calendar data |
| `src/components/planner/CalendarEventsSection.tsx` | Calendar events display component |

## Files to Modify
| File | Change |
|------|--------|
| `src/pages/Planner.tsx` | Add CalendarEventsSection as a new LayoutBlock |
| `src/hooks/useLayoutCustomization.ts` | Register `calendarEvents` in plan defaults |

## No-Calendar Fallback

If the user hasn't connected Google Calendar, the section will show a friendly prompt: "Connect your Google Calendar to see your upcoming events here" with a connect button. This ensures the planner page works perfectly even without the calendar connected.
