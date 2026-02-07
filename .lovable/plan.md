

## Compact Session List with Detail Popup

### Overview
Shrink the "Recent Sessions" container on the Training page and make each session card clickable. Clicking opens a slide-out Sheet (matching the Symptom Check-in pattern) showing detailed metrics for that training day.

### What the Detail Popup Will Show

Since Oura provides daily summaries (not per-workout data), the popup will display a comprehensive **Training Day Summary** organized into sections:

**Load Metrics** (from `training_trends` table):
- Training Load
- ACWR (Acute:Chronic Workload Ratio) with zone indicator (optimal/caution/risk)
- Strain
- Monotony

**Physiological Data** (from `wearable_sessions` table):
- HRV average
- Resting Heart Rate
- Activity Score (0-100)
- Total Steps
- Active Calories / Total Calories

**Recovery Context** (from `wearable_sessions` table):
- Sleep Score
- Readiness Score

Data that Oura does NOT provide and will NOT be shown: per-workout distance, pace, GPS route, individual workout type, or heart rate zone breakdowns.

---

### Technical Details

#### 1. Compact the SessionLogList Component
**File:** `src/components/dashboard/SessionLogList.tsx`

- Reduce padding from `p-6` to `p-4` on the outer container
- Reduce session card padding from `p-4` to `p-3`
- Reduce spacing between cards from `space-y-4` to `space-y-2`
- Reduce header margin from `mb-6` to `mb-3`
- Remove the hover scale effect on the outer container (`hover:scale-105 hover:-translate-y-1`) -- it's too dramatic for a list
- Add a `cursor-pointer` and `onClick` handler to each `SessionLogCard`
- Add a small chevron-right icon on each card to signal it's clickable

#### 2. Create Session Detail Sheet Component
**New file:** `src/components/dashboard/SessionDetailSheet.tsx`

- Uses the same `Sheet` pattern as `SymptomCheckInSheet`
- Accepts `session` data (date, load, calories, etc.) and an `open`/`onOpenChange` prop
- On open, queries `wearable_sessions` for the matching date to get full physiological data (activity_score, resting_hr, hrv_avg, total_steps, active/total calories, sleep_score, readiness_score)
- Also reads from `training_trends` for that date to get ACWR, strain, monotony
- Displays data in organized sections with appropriate icons and color-coded indicators
- Includes a `ScrollArea` for overflow content

#### 3. Wire Up Click Handlers
**File:** `src/components/dashboard/SessionLogList.tsx`

- Add state for `selectedSession` and `detailOpen`
- Pass `onClick` to each `SessionLogCard` that sets the selected session and opens the Sheet
- Render `SessionDetailSheet` at the bottom of the component

#### 4. Data Fetching in Detail Sheet
The detail sheet will make two queries when opened:
1. `wearable_sessions` filtered by `user_id` and `date` matching the session date
2. `training_trends` filtered by `user_id` and `date` matching the session date

Both queries are lightweight single-row lookups by primary key pattern (user_id + date).

