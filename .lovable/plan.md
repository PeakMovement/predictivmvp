

## Plan: Fix Build Errors + Consolidate Dashboard Refresh Buttons

### 1. Fix Build Errors (3 files)

**`src/components/onboarding/OnboardingWearable.tsx` (line 34)**
The `polar_tokens` table isn't in the generated Supabase types. Fix by casting the query with `as any` or using a raw RPC call, similar to how `useInjuryProfile.ts` uses `@ts-nocheck`. Simplest fix: add `// @ts-ignore` above line 34, or cast `.from("polar_tokens" as any)`.

**`src/components/settings/InjuryProfileSettings.tsx` (line 140)**
The zod schema makes `milestone` and `achieved` optional, but `ClearanceMilestone` requires them. Fix by casting `data.clearance_milestones as ClearanceMilestone[]` on line 140, since the form validation guarantees the fields exist.

### 2. Consolidate Dashboard Refresh Buttons

Currently, the `DailyBriefingCard` has a refresh button in its header (line 103-116) that calls `onRefresh()` + `trainingFocusRef.current?.refresh()`. The `TodaysBestDecision` component (rendered inside the briefing card) has its own separate refresh button.

**Change:** Remove the standalone refresh button from `TodaysBestDecision` so only the single top-level refresh button in the `DailyBriefingCard` header remains. When clicked, it already triggers both `onRefresh()` (which refreshes the Yves intelligence — briefing + recommendations) and `trainingFocusRef.current?.refresh()` (which refreshes the training focus/decision content).

This means one button refreshes everything: daily briefing text, key changes, risk highlights, today's training focus, and recommendations (since recommendations come from the same `useYvesIntelligence` hook).

### Files to Edit
1. `src/components/onboarding/OnboardingWearable.tsx` — cast `polar_tokens` table name
2. `src/components/settings/InjuryProfileSettings.tsx` — cast clearance milestones
3. `src/components/dashboard/TodaysBestDecision.tsx` — remove its refresh button from the header

