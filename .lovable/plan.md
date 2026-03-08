

# Proper Backend Challenge System

## Current State

Two overlapping tables exist: `accountability_challenges` (used by Training page) and `user_challenges` (used by Planner). Neither has backend intelligence. We'll consolidate onto `user_challenges` and build a full lifecycle.

## What We'll Build

### 1. New Edge Function: `generate-weekly-challenges`
AI-powered challenge generation that runs weekly (Monday morning) or on-demand:
- Gathers user context: recent wearable sessions (7 days), baselines/deviations, injury profile, wellness goals, recent completed/abandoned challenges
- Calls Lovable AI Gateway with structured tool calling to produce 2-3 personalised challenges with title, description, type, target_value, and reasoning
- Inserts into `user_challenges` with `status: 'pending'` and current `week_start_date`
- Skips generation if user already has pending/active challenges for the week

### 2. New Edge Function: `manage-challenge-lifecycle`
Scheduled daily via cron to handle expiry and progress:
- **Auto-expire**: Any challenge with `status: 'pending'` older than 3 days becomes `'expired'`
- **Auto-complete**: Any `'active'` challenge where `current_progress >= target_value` becomes `'completed'`
- **Week-end cleanup**: Active challenges past their `week_start_date + 7 days` get marked `'expired'`
- **Progress sync**: For active challenges, queries `wearable_sessions` to auto-update `current_progress` based on `challenge_type` (e.g., type `workout_frequency` counts sessions, `distance_goal` sums distances, `sleep_target` averages sleep scores)

### 3. Schema Migration
Add columns to `user_challenges`:
- `ai_reasoning TEXT` — why the AI suggested this challenge
- `expires_at TIMESTAMPTZ` — explicit expiry timestamp
- `progress_metric TEXT` — which wearable metric to track against (e.g., `session_count`, `total_distance`, `avg_sleep_score`)

### 4. Hook into Existing Sync Pipeline
After `generate-daily-briefing` runs, call `manage-challenge-lifecycle` to keep progress fresh. After Monday's briefing, call `generate-weekly-challenges`.

### 5. Frontend Updates
- `ChallengeAcceptanceModal` — show AI reasoning ("Why this challenge")
- `ActiveChallengeCard` — display live progress from wearable data instead of manual-only updates
- `useUserChallenges` hook — add `pendingChallenges` filter, auto-refresh on wearable sync
- Remove `accountability_challenges` references (consolidate to `user_challenges`)

### 6. Cron Jobs (SQL)
- `generate-weekly-challenges`: Monday 6am UTC
- `manage-challenge-lifecycle`: Daily 7am UTC

## Technical Details

**Challenge type → metric mapping** (in `manage-challenge-lifecycle`):
| challenge_type | wearable metric | calculation |
|---|---|---|
| workout_frequency | wearable_sessions | COUNT sessions this week |
| distance_goal | wearable_sessions.distance | SUM distance this week |
| sleep_target | wearable_sessions.sleep_score | AVG sleep score this week |
| recovery_focus | wearable_sessions.readiness | AVG readiness this week |
| hrv_improvement | wearable_sessions.hrv | AVG HRV this week |

**AI prompt structure**: Uses tool calling to return structured `challenges[]` array with required fields, avoiding JSON parsing issues.

**Files to create/edit**:
- `supabase/functions/generate-weekly-challenges/index.ts` (new)
- `supabase/functions/manage-challenge-lifecycle/index.ts` (new)
- `supabase/config.toml` (add both functions)
- Migration: add columns to `user_challenges`
- `src/hooks/useUserChallenges.ts` — add pending filter, progress metric display
- `src/components/planner/ChallengeAcceptanceModal.tsx` — show reasoning
- `src/components/training/ActiveChallengeCard.tsx` — live progress
- `src/components/training/AccountabilityChallenges.tsx` — switch to `user_challenges` table
- Cron SQL for both scheduled functions

