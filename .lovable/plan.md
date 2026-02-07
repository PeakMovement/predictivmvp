

# Connect Google Calendar to the Weekly Planner

## Overview

Wire up the "Connect Google Calendar" button so it actually connects the user's Google account via the Lovable connector gateway. Once connected, fetch the next 7 days of calendar events and display them grouped by day inside the existing card container -- replacing the empty-state prompt.

## How It Works

The Lovable platform provides a **Google Calendar connector** that handles OAuth behind the scenes. Once the connector is linked to the project, two secrets become available (`LOVABLE_API_KEY` and `GOOGLE_CALENDAR_API_KEY`). An edge function uses these to call the Google Calendar API through a gateway proxy -- no custom OAuth flow needed.

### User Experience

1. User clicks **"Connect Google Calendar"** on the Planner page
2. A connector prompt appears asking them to sign in with Google
3. Once connected, the calendar section automatically loads their next 7 days of events
4. Events are displayed grouped by day with time, title, and optional location
5. If the user has no upcoming events, a friendly "No events this week" message appears
6. A "Disconnect" option will also be available

---

## Technical Details

### Step 1 -- Link the Google Calendar Connector

Use the `google_calendar` connector to prompt the user for Google account authorization. This makes `GOOGLE_CALENDAR_API_KEY` available as an edge function secret.

### Step 2 -- Create Edge Function: `fetch-calendar-events`

**File:** `supabase/functions/fetch-calendar-events/index.ts`

This edge function:
- Validates the user's auth token (same pattern as `oura-auth-initiate`)
- Reads `LOVABLE_API_KEY` and `GOOGLE_CALENDAR_API_KEY` from environment
- Calls the Google Calendar API via the gateway:
  ```
  GET https://gateway.lovable.dev/google_calendar/calendar/v3/calendars/primary/events
  ```
  With query params: `timeMin` (now), `timeMax` (7 days from now), `singleEvents=true`, `orderBy=startTime`, `maxResults=50`
- Required headers:
  - `Authorization: Bearer ${LOVABLE_API_KEY}`
  - `X-Connection-Api-Key: ${GOOGLE_CALENDAR_API_KEY}`
- Returns a cleaned array of events with: `id`, `summary`, `start`, `end`, `location`, `description`

### Step 3 -- Create React Hook: `useCalendarEvents`

**File:** `src/hooks/useCalendarEvents.ts`

- Calls the `fetch-calendar-events` edge function with the user's auth token
- Manages state: `events`, `isLoading`, `error`, `isConnected`
- Groups events by date for easy rendering
- Provides a `refresh()` function
- Handles the "not connected" state gracefully (gateway returns an auth error if no connection)

### Step 4 -- Update the Planner Page Calendar Section

**File:** `src/pages/Planner.tsx`

Replace the static empty-state card with a dynamic component that has three states:

**State A -- Not Connected (current empty state):**
Shows the existing "Connect Google Calendar" button. Clicking it triggers the connector flow.

**State B -- Loading:**
Shows skeleton placeholders inside the card.

**State C -- Connected with Events:**
Displays events grouped by day in a clean list:

```
Today, Feb 7
  09:00  Team Standup           Google Meet
  14:00  Product Review         Room 3B

Saturday, Feb 8
  10:00  Gym Session
  16:00  Dinner Reservation     The Place

Sunday, Feb 9
  No events
```

Each day header uses the same tone styling as the rest of the planner. Events show time, title, and optional location in muted text.

### Step 5 -- Update `deno.json` (if needed)

No new imports are needed for the edge function beyond what's already available.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/fetch-calendar-events/index.ts` | **New** -- Edge function to fetch events via gateway |
| `src/hooks/useCalendarEvents.ts` | **New** -- React hook for calendar event state management |
| `src/pages/Planner.tsx` | **Modified** -- Replace static card with dynamic calendar display |

## What Won't Change

- The rest of the Planner page (Week Intent, Weekly Focus, Themes) is untouched
- No database tables are needed -- events are fetched live from Google each time
- Dark/light mode continues to work via theme tokens
- Layout customization still works for hiding/reordering the calendar section

