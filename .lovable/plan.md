

# Fix: Refresh Button Not Generating New Content

## Root Cause

There are two bugs working together to prevent refresh from producing new content:

### Bug 1: useEffect race condition (Frontend)
When `refresh()` is called, it invokes `fetchIntelligence(true)` (force refresh). However, `fetchIntelligence` is a `useCallback` dependency of the `useEffect` on line 161. React re-runs that effect, which calls `fetchIntelligence(false)` -- overwriting the fresh response with the cached one. The edge function logs confirm this: they show `force_refresh: false` even after tapping refresh.

### Bug 2: Silent-response upsert missing `focus_mode` (Backend)
The silent/silence-response upsert at line 935 of the edge function writes to `daily_briefings` without `focus_mode`. The cache lookup filters by `focus_mode`, so these rows are invisible to the cache check. This means on every non-forced load, a new row is generated but returns identical content because the underlying wearable data hasn't changed between clicks.

## Changes

### 1. `src/hooks/useYvesIntelligence.ts` -- Fix the race condition

- Add a `ref` to track whether a manual refresh is in progress
- When `isRefreshing` ref is true, skip the useEffect's automatic fetch
- Clear the ref after the manual refresh completes
- This ensures clicking refresh actually sends `force_refresh: true` to the edge function without being overridden

### 2. `supabase/functions/generate-yves-intelligence/index.ts` -- Fix silent upsert

- Add `focus_mode: focusMode` to the silent-response upsert at line 935 so it matches the cache key used by the lookup query
- This prevents orphaned rows that bypass cache and cause unnecessary regeneration

## Technical Details

### Frontend fix (useYvesIntelligence.ts)

```text
Before:
  refresh() -> fetchIntelligence(true) -> edge function called
  useEffect triggers -> fetchIntelligence(false) -> cache returned, overwrites state

After:
  refresh() -> sets isRefreshing ref -> fetchIntelligence(true) -> edge function called -> clears ref
  useEffect triggers -> sees isRefreshing ref -> skips fetch
```

### Backend fix (generate-yves-intelligence/index.ts)

Add `focus_mode: focusMode` to the silent-response upsert block so all upserts use a consistent key structure.

## What This Means For You

- Tapping the refresh button on the Daily Briefing will now actually call the AI to generate fresh content
- The recommendations card will also update with new suggestions on refresh
- Content will genuinely change each time you refresh (the topic variety engine is already in place -- it just wasn't being reached)
