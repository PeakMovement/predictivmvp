
# Plan: Move Today's Scores to Health Page

## Current State Analysis

**Dashboard (/)** currently has:
1. Daily Briefing (Yves) - KEEP
2. Risk Score - KEEP  
3. Today's Scores (Readiness, Sleep, Activity cards) - MOVE to Health
4. Today's Activity Section - MOVE to Health
5. Recommendations (Yves) - KEEP
6. Briefing Diagnostics - KEEP
7. Personalization Insights - KEEP

**Health page** already has:
- Score Cards (Readiness, Sleep, Activity) - Already present
- Detailed Metrics (HRV Card) - Already present
- Today Activity Section - Already present
- Data Source Info - Already present

## What This Plan Does

Since the Health page already has the same components (score cards, activity section), this is primarily a **cleanup of the Dashboard** to remove duplicate sections.

---

## Changes

### 1. Dashboard.tsx - Remove Moved Sections

**Remove from Dashboard:**
- Today's Scores LayoutBlock (lines 192-227) - Remove entire section
- Today's Activity LayoutBlock (lines 229-238) - Remove entire section
- Related imports that are no longer needed:
  - `OuraReadinessCard`
  - `OuraSleepCard`
  - `OuraActivityCard`
  - `TodayActivitySection`
  - `useWearableSessions`

**Keep on Dashboard:**
- Daily Briefing (Yves intelligence)
- Risk Score
- Yves Recommendations
- Briefing Diagnostics
- Personalization Insights
- Oura sync status (for connection confirmation)
- useOuraTokenStatus (for connection toast)

### 2. Health.tsx - No Backend Changes Needed

The Health page already:
- Has its own `useWearableSessions` hook connection
- Displays all three score cards (Readiness, Sleep, Activity)
- Shows Today's Activity section
- Has the detailed HRV metrics
- Has `OuraSyncStatus` component

All backend connections remain intact on the Health page.

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Remove Today's Scores section, Today's Activity section, and unused imports |

---

## Final Dashboard Structure

After changes, Dashboard will show (in order):
1. Welcome Header with Oura sync status
2. **Daily Briefing** (Yves intelligence)
3. **Risk Score** card
4. **Yves Recommendations** card
5. Briefing Diagnostics
6. Personalization Insights

## Final Health Page Structure

Health page remains unchanged with:
1. Header with Oura sync status
2. Score Cards (Readiness, Sleep, Activity)
3. Detailed Metrics (HRV)
4. Today's Activity
5. Data Source Info

---

## Technical Notes

- No backend changes required - all hooks and Supabase connections remain
- The Health page already has independent data fetching via `useWearableSessions`
- Oura token status and sync listeners stay on Dashboard for connection management
- Both pages will continue to receive real-time updates via Supabase channels
