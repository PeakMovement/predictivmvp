
## Device Source Switcher for Wearable Data Sections

### The Problem

When both Oura Ring and Garmin are connected, `wearable_sessions` will contain rows from both sources on the same dates. Currently all queries just return the most recent row regardless of device, which means data from both devices gets silently blended or one overwrites the other. Each device measures different things (e.g. Oura has SpO2 and sleep stages; Garmin will have GPS distance and step counts) and mixing them is incorrect.

### Scope: Which Sections Need a Switcher

Only sections that query `wearable_sessions` directly and will receive rows from multiple devices need the switcher. Based on the codebase analysis:

**1. Health Page — Score Cards + HRV + Sleep Detail + Trends Chart**
All four card groups (Readiness, Sleep, Activity, HRV/HR) and `HealthTrendsChart` pull from `wearable_sessions`. This is the primary place for the device switcher.

**2. Training Page — Gauges (Total Calories, Readiness)**
The `CircularGauge` components for Total Calories and Readiness pull from `useWearableSessions`.

**Does NOT need a switcher:**
- `training_trends` (no source column — computed load metrics)
- Session Logs (per-session records, already source-labelled)
- Dashboard (AI briefing, risk score, recommendations — not raw device rows)
- Running Distance gauge (already has its own Garmin/Oura priority logic)

---

### Implementation Plan

#### Step 1 — Create a reusable `DeviceSourceSwitcher` component

A small pill-style toggle that appears at the top of a section. It:
- Takes an array of available sources (`['oura', 'garmin']`) detected from the DB
- Shows device names with their icons (Oura ring icon, Garmin icon using Lucide Watch/Activity)
- Emits the selected source string to the parent
- Is hidden/disabled if only one device is connected (no point switching)

File: `src/components/DeviceSourceSwitcher.tsx`

```
[ Ōura Ring ]  [ Garmin ]   ← pill toggle, active device highlighted
```

#### Step 2 — Update `useWearableSessions` to accept a `source` filter

Add an optional `source?: string` parameter. When provided, add `.eq("source", source)` to the query. When omitted or `"auto"`, fall back to the current behaviour (most recent any-source row).

This keeps backward compatibility — the Dashboard and other pages that don't use the switcher continue to work as-is.

#### Step 3 — Update Health page (`src/pages/Health.tsx`)

- On mount, query `wearable_sessions` `DISTINCT source` for the current user to detect which devices have data.
- Render `DeviceSourceSwitcher` at the top of the Score Cards section (below the sync status, above the 3 score cards).
- Pass the selected source down into `useWearableSessions(userId, selectedSource)`.
- Also pass `selectedSource` to `HealthTrendsChart` so the trends chart filters by that source too.

#### Step 4 — Update `HealthTrendsChart` to accept a `source` prop

Add `source?: string` prop. When provided, add `.eq("source", source)` to the Supabase query inside `fetchTrends`. This ensures the 7/30-day line chart reflects only the selected device's data.

#### Step 5 — Update Training page (`src/pages/Training.tsx`)

- Add same device detection logic.
- Render `DeviceSourceSwitcher` above the gauges block.
- Pass selected source to `useWearableSessions(userId, selectedSource)` so the Total Calories and Readiness gauges show per-device values.

---

### What the Switcher Looks Like

```text
+------------------------------------------+
|  Data from:  [ Ōura Ring ]  [ Garmin ]   |
+------------------------------------------+
|   Readiness      Sleep       Activity    |
|     82            76           71        |
+------------------------------------------+
```

- Only renders when 2+ device sources have rows in `wearable_sessions`
- If only Oura has data today (common now), the switcher either hides or shows Garmin as "No data yet" greyed out
- Active device is highlighted with the primary colour pill

---

### Technical Details

**Device detection query (run once on mount):**
```sql
SELECT DISTINCT source 
FROM wearable_sessions 
WHERE user_id = $1
ORDER BY source
```

**Modified `useWearableSessions` signature:**
```typescript
export const useWearableSessions = (
  userId: string | undefined,
  source?: string   // new optional param
) => { ... }
```

**Files to change:**
1. `src/components/DeviceSourceSwitcher.tsx` — new file
2. `src/hooks/useWearableSessions.ts` — add optional `source` param
3. `src/pages/Health.tsx` — add switcher + source state + device detection
4. `src/components/health/HealthTrendsChart.tsx` — add `source` prop
5. `src/pages/Training.tsx` — add switcher + source state above gauges

No database changes required. No new packages needed.
