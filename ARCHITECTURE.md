# Predictiv — Complete System Architecture

> Generated: 2026-03-07. Covers every page, edge function, database table, data flow, external integration, known gap, and pillar assessment for the Predictiv platform.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Pages](#2-pages)
3. [Edge Functions](#3-edge-functions)
4. [Database Tables](#4-database-tables)
5. [Data Flow](#5-data-flow)
6. [External Integrations](#6-external-integrations)
7. [Known Gaps](#7-known-gaps)
8. [Four Core Pillars — What Exists vs What's Needed](#8-four-core-pillars)

---

## 1. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript + Vite |
| Routing | React Router v6 (all authenticated pages lazy-loaded) |
| Server state | TanStack Query (React Query) |
| UI components | Shadcn/ui + Tailwind CSS (glassmorphism) |
| Backend platform | Supabase (PostgreSQL + Edge Functions + Auth + Realtime + Storage) |
| Edge runtime | Deno (all edge functions) |
| AI provider | Lovable gateway → google/gemini-2.5-flash (fallback chain: Lovable → OpenAI → Anthropic → Google) |
| SMS | Twilio (South African +27 numbers) |
| Email | Resend |
| Charts | Recharts |
| Data export | html2canvas (PNG) |
| CSV parsing | PapaParse |

---

## 2. Pages

### 2.1 App Shell — `src/App.tsx`

Three render states gated in order:
1. **Unauthenticated** → shows `<Auth />` page
2. **Authenticated + onboarding incomplete** → shows `<Onboarding />` (checks `user_profiles.onboarding_completed`)
3. **Authenticated + onboarded** → full authenticated shell

Global floating components rendered in the shell (always present):
- `OfflineBanner` — detects navigator.onLine
- `SessionTimeoutWarning` — 30-min inactivity timer → Supabase signOut
- `SymptomCheckInSheet` — global slide-over drawer
- `YvesChatSheet` — global chat slide-over
- `RiskAlertPopup` — dismissible alert banner
- `BottomNavigation` — mobile tab bar

SIGNED_OUT event clears localStorage and sessionStorage (briefing cache, layout, findHelp query, etc.)

All authenticated page components are React.lazy imports.

---

### 2.2 Dashboard — `src/pages/Dashboard.tsx`

**Purpose:** Primary home screen. Daily briefing, AI recommendations, risk score, quick actions.

**Key hooks:**
- `useYvesIntelligence('balance')` — fetches daily briefing + recommendations
- `useOuraTokenStatus` — checks wearable connection
- `useLayoutCustomization('dashboard')` — per-user drag/hide/reorder layout

**Components:**
- `DailyBriefingCard` — renders today's briefing from `daily_briefings`
- `YvesRecommendationsCard` — renders 3 recommendations from `yves_recommendations`
- `RiskScoreCard` — aggregate risk score from `user_deviations`
- `QuickActionsPanel` — shortcut buttons
- `PersonalizationInsights` — shows how well Yves knows the user
- `BriefingDiagnostics` — debug overlay (dev mode only)

**Realtime:** Subscribes to `oura_logs` INSERT events → refreshes trend data 2 s later.

**Layout:** Customizable via `LayoutBlock` + `LayoutEditor`. Saved to localStorage key `layout_customization_dashboard`.

---

### 2.3 Training — `src/pages/Training.tsx`

**Purpose:** Training load, trends, session log, Garmin/Oura activity data.

**Key hooks:**
- `useTrainingTrends` — 28-day training/recovery trends from `training_trends`
- `useWearableSessions` — latest session from `wearable_sessions`
- `useGarminRunningDistance` — running distance from Garmin sessions

**Components:**
- 6× `CircularGauge` — ACWR, Strain, Monotony, Readiness, Sleep Score, HRV
- `UnifiedTrendCard` — recharts area chart of any metric over time
- `TrainingCalendar` — monthly view with session markers
- `SessionLogList` — list of past sessions
- `SessionComparison` modal — compare two sessions side-by-side
- `DeviceSourceSwitcher` — toggle between Oura / Garmin / Polar data
- `AccountabilityChallenges` — streak/challenge cards

**Banner:** Shows "Garmin Pending" warning when a Garmin token exists but `wearable_sessions` has no Garmin rows.

---

### 2.4 Health — `src/pages/Health.tsx`

**Purpose:** Wearable health metrics — readiness, sleep, activity, HRV.

**Key hooks:**
- `useWearableSessions(userId, selectedSource)` — latest session
- `useLayoutCustomization('health')`

**Components:**
- `OuraReadinessCard` — readiness score, resting HR, HRV
- `OuraSleepCard` — sleep score, total/deep/REM/light/efficiency
- `OuraActivityCard` — activity score, steps, active/total calories
- `OuraHRVCard` — HRV, resting HR, SpO2
- `HealthTrendsChart` — multi-metric recharts line chart
- `TodayActivitySection` — intraday activity
- `DeviceSourceSwitcher`
- `OuraSyncStatus` — last sync time + manual sync button

**Empty states:** Two distinct states — no device connected vs. device connected but no data.

**Pull-to-refresh:** Wrapped in `PullToRefresh` on mobile.

---

### 2.5 Find Help — `src/pages/FindHelp.tsx`

**Purpose:** AI-powered practitioner matching and booking.

**Flow:**
1. User types a health query
2. Page calls `match-provider` edge function → returns `ParsedIntent` (sport, symptom, urgency, location, provider_type)
3. Loads `/practitioners.csv` via PapaParse (public asset — NOT a DB table)
4. Filters/ranks practitioners against ParsedIntent
5. Displays results with contact + Calendly booking links

**Emergency state:** If urgency = critical, shows SA emergency phone numbers.

**Cross-page trigger:** Other pages can pre-populate the query via `sessionStorage.findHelpQuery`.

---

### 2.6 Planner — `src/pages/Planner.tsx`

**Purpose:** Weekly planning and reflection.

**Key hook:** `useWeeklyBriefings` — aggregates `daily_briefings` rows into a weekly view.

**Components:**
- `WeekIntentSection` — user sets weekly intention
- `WeeklyFocusBanner` — AI-generated weekly theme
- `ThemeCard` + `ChallengeAcceptanceModal`
- `DailyPlanView` — day-by-day breakdown
- `WeeklyReflectionModal` — auto-prompts Sunday after 18:00

**Gap:** Google Calendar section is a placeholder — events are never fetched or rendered.

---

### 2.7 Settings — `src/pages/Settings.tsx`

**Sections:**
- `ProfileSettings` — name, DOB, gender, activity level
- `TonePreferenceSettings` — Yves communication style
- `DevicesSettings` — connect/disconnect Oura, Garmin, Polar
- `NotificationsSettings` — push/SMS/email toggles
- `AppearanceSettings` — theme, dark mode
- `AccountSettings` — password change, delete account

---

### 2.8 Symptom Check-In — `src/pages/SymptomCheckIn.tsx`

**Components:**
- `SymptomCheckInForm` — body location, severity, duration, notes
- `SymptomHistory` — list of past check-ins from `symptom_check_ins`

Submitting the form calls `interpret-health-event` edge function → stores result in `symptom_check_ins`.

---

### 2.9 Insights Tree — `src/pages/InsightsTree.tsx`

**Purpose:** Visual timeline of past AI insights.

**Gap:** Reads `insightHistory` from localStorage only. The `yves-tree` edge function exists but is never called from this page. Falls back to 15 hardcoded placeholder nodes if localStorage is empty.

---

### 2.10 Your Plan — `src/pages/YourPlan.tsx`

**Gap:** Reads `acceptedAdjustments` and `userBookings` from localStorage only. Nothing is persisted to the database.

---

### 2.11 Plan Compliance — `src/pages/PlanCompliance.tsx`

**Purpose:** Adherence tracking against a training plan.

Reads from `plan_adherence` table. The `calculate-plan-adherence` edge function has no scheduled trigger and is never called from the frontend, so the table is always empty.

---

### 2.12 Metrics Dashboard — `src/pages/MetricsDashboard.tsx`

- 6× `MetricSparklineCard` — sparkline + current value for each metric
- `InteractiveChart` — full recharts chart with date range picker
- Export to PNG via html2canvas
- Uses `useWearableMetrics` + `useWearableSessions`

---

### 2.13 Alert History — `src/pages/AlertHistory.tsx`

Full alert lifecycle management: filter by severity/status, add notes, dismiss/resolve/snooze. Direct read/write to `alert_history`.

---

### 2.14 My Documents — `src/pages/MyDocuments.tsx`

- `DocumentUploadZone` × 3 types (medical, training, nutrition)
- `DocumentCard` with preview + delete
- `DocumentPreviewModal`
- `DocumentVersionHistoryModal`
- Uses `useDocuments` hook → Supabase Storage + `user_documents` table

---

### 2.15 My Baselines — `src/pages/MyBaselines.tsx`

- `ActivityPanel`
- `WeeklyTrendChart`
- `DailyHealthPanel`
- `RecoveryPanel`

Reads from `user_baselines` (28-day rolling averages).

---

### 2.16 Admin Dashboard — `src/pages/AdminDashboard.tsx`

Gated by `user_roles` check. Components:
- `UserOverviewTable`
- `SystemHealthOverview`
- `SyncLogsTable`
- `AnomalyAlertsList`

---

### 2.17 Personal Canvas — `src/pages/PersonalCanvas.tsx`

Drag-and-drop layout builder. Maps block IDs to real components (RiskScoreCard, DailyBriefingCard, etc.). Saves layout to localStorage.

---

### 2.18 Auth / Onboarding

- `src/pages/Auth.tsx` — email/password sign in + sign up
- `src/pages/Onboarding.tsx` — multi-step profile setup; sets `user_profiles.onboarding_completed = true` on completion

---

## 3. Edge Functions

All functions live in `supabase/functions/`. Runtime: Deno.

### 3.1 AI / Yves Intelligence

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `yves-chat` | Streaming chat Q&A | 16 sources (see below) | `insight_history` |
| `generate-daily-briefing` | Idempotent daily briefing; 6 categories | 16+ sources | `daily_briefings` |
| `generate-yves-recommendations` | 3 structured recommendations | 16 sources (parallel) | `yves_recommendations` |
| `yves-tree` | Insight tree data | `insight_history` | — (never called from UI) |
| `adapt-user-model` | Updates user model based on feedback | — | — (never called) |

**16 data sources fetched before every Yves AI call:**
user_profile, user_context_enhanced, user_health_profiles, user_documents, insight_history (last 5), yves_memory_bank, wearable_summary, wearable_sessions (last 14 days), training_trends, recovery_trends, health_anomalies (unacknowledged), user_deviations, symptom_check_ins, user_baselines, user_training, user_lifestyle, user_interests, user_wellness_goals

**Coaching mode classification** (rehab / performance / general_wellness):
- `rehab`: active injuries, severe symptoms, ACWR > 1.5, critical anomalies
- `performance`: performance goals, high activity, optimal ACWR
- `general_wellness`: default

---

### 3.2 Wearable Data Sync

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `fetch-oura-data` | Oura v2 sync (sleep, readiness, activity, SpO2) | Oura API v2 | `wearable_sessions`, `oura_logs` |
| `fetch-garmin-data` | Garmin Wellness API sync (dailies, sleeps, activities) | Garmin API | `wearable_sessions` |
| `garmin-auth` | Garmin OAuth 2.0 PKCE callback handler | `garmin_oauth_state` | `wearable_tokens`, triggers `fetch-garmin-data` |
| `garmin-connect` | Initiates Garmin OAuth PKCE flow | — | `garmin_oauth_state` |
| `oura-auth` | Oura OAuth callback | Oura token endpoint | `wearable_tokens` |
| `polar-auth` | Polar OAuth callback | Polar token endpoint | `wearable_tokens` |

**Oura token refresh:** `_shared/oura-token-refresh.ts` handles automatic token refresh before each fetch.
**Caching:** `_shared/cache.ts` provides short-lived response caching.

---

### 3.3 Analytics & Risk

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `detect-health-anomalies` | Detects metric deviations vs physiological thresholds | `wearable_sessions`, `user_baselines` | `health_anomalies` |
| `trigger-risk-alert` | Fires alerts for hardcoded thresholds | `training_trends`, `wearable_sessions` | `alert_history` |
| `calculate-training-trends` | Computes ACWR, strain, monotony | `wearable_sessions` | `training_trends`, `recovery_trends` |
| `calculate-plan-adherence` | Plan adherence scoring | `user_training`, `wearable_sessions` | `plan_adherence` |

**`detect-health-anomalies` thresholds:**
- HRV: ±30% = medium, ±60% = critical
- Resting HR: ±20% = medium, ±35% = critical
- Sleep/Readiness: ±25% = medium, ±40% = critical
- Activity: ±40% = medium, ±80% = critical

**`trigger-risk-alert` hardcoded thresholds:**
- ACWR > 1.8
- Strain > 3500
- Readiness < 40
- Sleep score < 45

> Note: `alert_settings` table exists but is NOT read by `trigger-risk-alert` — thresholds are hardcoded.

---

### 3.4 AI Health Analysis

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `interpret-health-event` | AI interpretation of a symptom check-in | `symptom_check_ins`, user profile | `symptom_check_ins` (updates interpretation) |
| `build-health-profile` | AI synthesis of all profile + document data | All profile tables, `document_insights` | `user_health_profiles` |
| `analyze-document` | Extract structured data from uploaded documents | Supabase Storage | `document_insights` |
| `match-provider` | AI structured tool call to parse symptom query and match practitioner type | User query | Returns ParsedIntent (no DB write) |

---

### 3.5 Notifications

| Function | Purpose | Reads | Writes |
|---|---|---|---|
| `send-sms-alert` | Twilio SMS (SA +27 only) | `notification_log` | `notification_log` |
| `send-push-notification` | Web push via VAPID | `push_subscriptions` | `notification_log` |
| `send-email` | Resend email | — | `notification_log` |
| `calendly-webhook` | Receives Calendly `invitee.created` event, creates booking, sends confirmation email | Calendly webhook payload | `bookings`, sends Resend email |

---

### 3.6 Google Calendar

| Function | Purpose |
|---|---|
| `google-calendar-auth` | OAuth 2.0 callback for Google Calendar |
| `fetch-google-calendar-events` | Fetches events from Google Calendar API |
| `create-google-calendar-event` | Creates event in user's Google Calendar |

> Note: These functions exist but the Planner page does not call them — Google Calendar section in Planner is a UI placeholder only.

---

### 3.7 Shared Utilities (`_shared/`)

| File | Purpose |
|---|---|
| `ai-provider.ts` | Auto-detects AI provider: Lovable → OpenAI → Anthropic → Google |
| `rate-limiter.ts` | Sliding window rate limiter backed by `rate_limits` table |
| `oura-token-refresh.ts` | Refreshes Oura access token before expiry |
| `cache.ts` | Short-lived in-memory response cache |
| `cors.ts` | Standard CORS headers for all functions |

---

## 4. Database Tables

### 4.1 Auth & Users

| Table | Purpose | Key Columns |
|---|---|---|
| `user_profiles` | Core user profile, onboarding state | `id`, `onboarding_completed`, `name`, `email`, `avatar_url` |
| `user_roles` | Admin/user role assignments | `user_id`, `role` |

---

### 4.2 Wearable Data

| Table | Purpose | Key Columns |
|---|---|---|
| `wearable_tokens` | OAuth tokens for all devices | `user_id`, `scope` (oura/garmin/polar), `access_token`, `refresh_token`, `expires_at`, `provider_user_id` |
| `wearable_sessions` | **Central wearable data table.** One row per user per date per source. | `user_id`, `date`, `source`, `readiness_score`, `sleep_score`, `activity_score`, `hrv_avg`, `resting_hr`, `spo2_avg`, `total_steps`, `active_calories`, `total_calories`, `total_sleep_duration`, `deep_sleep_duration`, `rem_sleep_duration`, `light_sleep_duration`, `sleep_efficiency`, `fetched_at` |
| `wearable_summary` | Aggregated metrics per user | `user_id`, `strain`, `monotony`, `acwr`, `readiness_index`, `avg_sleep_score` |
| `oura_logs` | Sync audit log for Oura fetches | `user_id`, `status`, `entries_synced`, `error`, `created_at` |
| `garmin_oauth_state` | PKCE state + code_verifier for Garmin OAuth | `state`, `code_verifier`, `user_id`, `expires_at` |

---

### 4.3 User Health Profile (10 tables)

| Table | Purpose |
|---|---|
| `user_training` | preferred_activities, training_frequency, intensity_preference, current_phase |
| `user_lifestyle` | stress_level, work_schedule, daily_routine |
| `user_interests` | hobbies, interests (arrays) |
| `user_wellness_goals` | goals, target_date, priority |
| `user_injuries` | injury history, body location, severity, dates |
| `user_nutrition` | diet_type, allergies, eating_patterns |
| `user_medical` | conditions, medications, notes |
| `user_recovery` | sleep_hours_target, recovery_methods |
| `user_mindset` | motivation_factors, stress_management |
| `user_context_enhanced` | Aggregated preference summary for fast AI access |

---

### 4.4 AI Intelligence

| Table | Purpose | Key Columns |
|---|---|---|
| `user_baselines` | 28-day rolling averages per metric | `user_id`, `metric`, `rolling_avg` |
| `user_health_profiles` | AI-synthesized health summary | `user_id`, `profile_data`, `ai_synthesis`, `version` |
| `yves_memory_bank` | Long-term Yves memory | `user_id`, `memory_key`, `memory_value` |
| `insight_history` | All Yves chat Q&A | `user_id`, `query`, `response`, `created_at` |
| `daily_briefings` | Generated daily briefings | `user_id`, `date`, `category`, `content`, `coaching_mode` |
| `yves_recommendations` | 3 structured recommendations | `user_id`, `title`, `body`, `priority`, `created_at` |
| `user_context` | Basic user context | `user_id`, `context` |

---

### 4.5 Training & Analytics

| Table | Purpose | Key Columns |
|---|---|---|
| `training_trends` | Daily ACWR, strain, monotony, HRV, sleep_score | `user_id`, `date`, `acwr`, `strain`, `monotony`, `hrv`, `sleep_score` |
| `recovery_trends` | Chronic/acute load, ACWR, recovery score | `user_id`, `date`, `chronic_load`, `acute_load`, `acwr`, `acwr_trend`, `recovery_score` |
| `plan_adherence` | Adherence scoring (always empty — no trigger) | `user_id`, `date`, `adherence_score` |

---

### 4.6 Risk & Alerts

| Table | Purpose | Key Columns |
|---|---|---|
| `health_anomalies` | Detected metric anomalies | `user_id`, `metric_name`, `severity`, `deviation_percent`, `acknowledged` |
| `user_deviations` | Current metric vs baseline | `user_id`, `metric`, `deviation_percent`, `risk_zone`, `baseline_value`, `current_value` |
| `alert_history` | Full alert lifecycle | `user_id`, `type`, `severity`, `status`, `notes`, `snoozed_until` |
| `alert_settings` | User alert preferences (NOT used by trigger-risk-alert) | `user_id`, `metric`, `threshold`, `enabled` |

---

### 4.7 Symptom & Check-In

| Table | Purpose | Key Columns |
|---|---|---|
| `symptom_check_ins` | User symptom submissions + AI interpretation | `user_id`, `location`, `severity`, `duration`, `notes`, `interpretation`, `created_at` |

---

### 4.8 Documents

| Table | Purpose | Key Columns |
|---|---|---|
| `user_documents` | Document metadata | `user_id`, `type`, `file_path`, `version`, `created_at` |
| `document_insights` | AI-extracted structured data from documents | `user_id`, `document_id`, `category`, `insights` |

---

### 4.9 Notifications & Bookings

| Table | Purpose | Key Columns |
|---|---|---|
| `notification_log` | Audit log for all SMS/email/push notifications | `user_id`, `channel`, `status`, `sent_at` |
| `push_subscriptions` | Web push VAPID subscriptions | `user_id`, `endpoint`, `keys` |
| `bookings` | Calendly-sourced practitioner bookings | `user_id`, `practitioner`, `datetime`, `status` |

---

### 4.10 Rate Limiting & Misc

| Table | Purpose |
|---|---|
| `rate_limits` | Sliding window rate limit state (used by ai functions: 20 req/hr) |
| `escalation_rules` | Escalation config (exists, appears empty/unused) |

---

## 5. Data Flow

### 5.1 Wearable → Database

```
User connects Oura via OAuth
  → oura-auth edge function exchanges code for tokens
  → stores in wearable_tokens (scope = 'oura')

Sync triggered (manual or cron):
  → fetch-oura-data edge function
  → reads wearable_tokens for user
  → calls Oura API v2: /daily_readiness, /daily_sleep, /daily_activity, /spo2/multiple_days
  → upserts rows to wearable_sessions (one row per date per source)
  → logs result to oura_logs

Same flow for Garmin:
  → garmin-connect initiates PKCE flow, stores state in garmin_oauth_state
  → user authorizes on Garmin
  → garmin-auth callback: validates state, exchanges code, stores tokens
  → immediately triggers fetch-garmin-data (fire-and-forget)
  → fetch-garmin-data calls /wellness-api/rest/dailies, /sleeps, /activities
  → upserts to wearable_sessions (source = 'garmin')
```

### 5.2 Database → AI

```
Any Yves AI function (yves-chat, generate-daily-briefing, generate-yves-recommendations):

1. Parallel fetch of 16 data sources from Supabase
2. Classify coaching mode: rehab / performance / general_wellness
3. Build baseline comparison string from user_baselines
4. Compose system prompt with:
   - Yves persona rules (baseline comparison, context anchoring, one-recommendation, etc.)
   - User's full profile context
   - Current metric values vs personal baselines
   - Coaching mode-specific instructions
5. Call ai-provider (Lovable gateway → gemini-2.5-flash)
6. Write response to insight_history / daily_briefings / yves_recommendations
```

### 5.3 Database → UI

```
Dashboard loads:
  → useYvesIntelligence('balance') fetches daily_briefings + yves_recommendations
  → DailyBriefingCard + YvesRecommendationsCard render

Health page loads:
  → useWearableSessions(userId, source) fetches latest wearable_sessions row
  → Oura/Garmin cards render with that data

Realtime:
  → oura_logs INSERT (Supabase Realtime) → Dashboard refreshes trends after 2s delay

Alert changes:
  → RiskAlertPopup polls health_anomalies on mount
```

### 5.4 Symptom → AI → Storage

```
User submits symptom form (SymptomCheckInForm)
  → inserts row to symptom_check_ins
  → calls interpret-health-event edge function
  → function reads symptom + user profile
  → AI generates interpretation
  → updates symptom_check_ins.interpretation
  → SymptomHistory re-renders
```

### 5.5 Find Help Flow

```
User types query in FindHelp page
  → calls match-provider edge function (rate-limited)
  → edge function calls AI with structured tool: parse_symptom_query
  → returns ParsedIntent: { sport, symptom, urgency, location, provider_type }
  → frontend loads /practitioners.csv via PapaParse
  → filters + ranks practitioners against ParsedIntent
  → renders results with booking links
```

---

## 6. External Integrations

### 6.1 Oura Ring
- **Auth:** OAuth 2.0 (authorization_code flow)
- **API version:** v2 (`https://api.ouraring.com/v2`)
- **Endpoints used:** `/usercollection/daily_readiness`, `/usercollection/daily_sleep`, `/usercollection/daily_activity`, `/usercollection/spo2/multiple_days`
- **Token refresh:** Automatic via `_shared/oura-token-refresh.ts`
- **Data landing:** `wearable_sessions` (source = 'oura')

### 6.2 Garmin
- **Auth:** OAuth 2.0 PKCE (`https://diauth.garmin.com/di-oauth2-service/oauth/token`)
- **API:** Garmin Wellness API (`https://apis.garmin.com/wellness-api/rest`)
- **Endpoints used:** `/dailies`, `/sleeps`, `/activities`
- **Provider user ID:** Fetched from `/wellness-api/rest/user/id` after auth and stored in `wearable_tokens.provider_user_id` for webhook matching
- **Data landing:** `wearable_sessions` (source = 'garmin')

### 6.3 Polar
- **Auth:** OAuth 2.0 callback (`polar-auth` function exists)
- **Status:** Auth flow implemented; data fetch function not confirmed active

### 6.4 Google Calendar
- **Auth:** OAuth 2.0 (`google-calendar-auth` function exists)
- **Functions:** `fetch-google-calendar-events`, `create-google-calendar-event` exist
- **Status:** Functions built but Planner page does not call them — UI is a placeholder

### 6.5 Calendly
- **Integration:** Webhook receiver (`calendly-webhook` function)
- **Trigger:** Calendly sends `invitee.created` event
- **Action:** Creates row in `bookings`, sends confirmation email via Resend
- **Gap:** No Calendly booking UI within the app — users must book externally and webhook fires after

### 6.6 Twilio
- **Purpose:** SMS alerts
- **Restriction:** South African +27 numbers only (validated in `send-sms-alert`)
- **Audit:** Logged to `notification_log`

### 6.7 Resend
- **Purpose:** Transactional email (booking confirmations, alerts)
- **Used by:** `calendly-webhook`, `send-email` functions

### 6.8 Lovable AI Gateway
- **URL:** Lovable's hosted AI proxy
- **Model:** google/gemini-2.5-flash
- **Fallback chain:** Lovable → OpenAI → Anthropic → Google (auto-detected from env vars in `_shared/ai-provider.ts`)

---

## 7. Known Gaps

| # | Gap | Location | Impact |
|---|---|---|---|
| 1 | **YourPlan data in localStorage only** | `src/pages/YourPlan.tsx` | Accepted adjustments and bookings lost on browser clear |
| 2 | **InsightsTree disconnected from real data** | `src/pages/InsightsTree.tsx` | Shows 15 placeholder nodes; `yves-tree` function never called |
| 3 | **Google Calendar events never rendered** | `src/pages/Planner.tsx` | Google Calendar section is static UI placeholder |
| 4 | **Calendly booking path missing from app UI** | FindHelp, YourPlan | Users must book externally; no in-app booking UI |
| 5 | **`calculate-plan-adherence` has no trigger** | `supabase/functions/calculate-plan-adherence` | `plan_adherence` table always empty; PlanCompliance page shows nothing |
| 6 | **`trigger-risk-alert` ignores `alert_settings`** | `supabase/functions/trigger-risk-alert` | Hardcoded thresholds used; user preferences ignored |
| 7 | **`adapt-user-model` never runs** | `supabase/functions/adapt-user-model` | User model never auto-updates from feedback |
| 8 | **`yves-tree` never called from UI** | `supabase/functions/yves-tree` | Built but unused |
| 9 | **Polar data fetch unconfirmed** | `supabase/functions/polar-auth` | Auth flow exists; no confirmed data sync function |
| 10 | **Practitioners from CSV, not DB** | `src/pages/FindHelp.tsx` + `/public/practitioners.csv` | Practitioners can't be managed via DB; no CMS |
| 11 | **Medical session flow has no UI** | — | `interpret-health-event` exists but no dedicated medical consultation UI |
| 12 | **`escalation_rules` table empty** | DB | No escalation logic implemented |
| 13 | **Fitbit dead code** | Various | Fitbit references remain (e.g., old table names `fitbit_trends` in comments); Fitbit OAuth not functional |
| 14 | **`physicians` table superseded** | DB | Old `physicians` table exists; FindHelp now uses CSV |

---

## 8. Four Core Pillars

### Pillar 1: Clean Wearable Data Display (Oura + Garmin)

#### What Exists
- `wearable_sessions` table stores both Oura and Garmin data (unified by `source` column)
- `DeviceSourceSwitcher` component lets user toggle between sources on Health and Training pages
- Oura sync: fetch + token refresh + caching working end-to-end
- Garmin sync: PKCE auth + data fetch working end-to-end
- All major metric cards (readiness, sleep, activity, HRV) render correctly from `wearable_sessions`
- Two distinct empty states (no device / no data) on Health page
- Stale-data warning shown when last sync > 24h

#### What's Needed
- Garmin intraday heart rate (not currently fetched)
- Polar data fetch function (auth exists, no sync)
- Data freshness indicator per source (currently only one global sync status)
- Scheduled cron for automatic Garmin sync (currently only on auth + manual trigger)

---

### Pillar 2: Hyper-Personalised AI Intelligence (Yves)

#### What Exists
- Full 16-source context aggregation before every AI call
- 28-day rolling baselines (`user_baselines`) — every metric compared to personal norm
- Coaching mode classification (rehab / performance / general_wellness)
- Streaming chat (`yves-chat`) with rate limiting (20 req/hr)
- Idempotent daily briefing generation with 6 categories
- 3 structured recommendations with priority
- Yves memory bank for long-term preference storage
- System prompt enforces: baseline comparison, context anchoring, one-recommendation, vague question protocol, hard truth protocol, adaptive length

#### What's Needed
- Trigger for `generate-daily-briefing` to run automatically (cron not confirmed active)
- Trigger for `generate-yves-recommendations` (called manually from UI only)
- InsightsTree to read from `insight_history` instead of localStorage
- YourPlan accepted adjustments persisted to DB (currently localStorage only)

---

### Pillar 3: Early Injury Detection + Symptom Check-In

#### What Exists
- `detect-health-anomalies` with 4-level severity (low/medium/high/critical) and physiological thresholds per metric
- `health_anomalies` table with unacknowledged tracking
- `user_deviations` with risk_zone (green/yellow/red) and deviation percentages
- `trigger-risk-alert` fires to `alert_history` when hardcoded thresholds crossed
- `RiskAlertPopup` surfaces unacknowledged anomalies in the global UI
- `SymptomCheckInSheet` global drawer for quick check-ins
- `interpret-health-event` AI interpretation of submitted symptoms
- `alert_history` with full lifecycle (dismiss/resolve/snooze/notes)

#### What's Needed
- `trigger-risk-alert` to respect `alert_settings` instead of hardcoded thresholds
- Cron trigger for `detect-health-anomalies` (must run after each sync)
- Escalation logic using `escalation_rules` table
- Dedicated symptom-to-care pathway UI (current check-in has no "next steps" flow)

---

### Pillar 4: Working Help Page with Professional Matching + Booking

#### What Exists
- Three-step FindHelp flow: query → AI parsing → results
- `match-provider` edge function with structured AI tool call returning ParsedIntent
- Practitioner filtering + ranking from `/practitioners.csv`
- Emergency state with SA phone numbers for critical urgency
- Cross-page trigger via sessionStorage
- `calendly-webhook` receives booking confirmation and creates `bookings` row

#### What's Needed
- In-app Calendly embed (currently users book externally)
- Practitioner data in DB (currently hardcoded CSV — no way to add/update practitioners without a file deploy)
- Booking history visible to user (bookings written to DB but no UI shows them)
- YourPlan page to read bookings from DB instead of localStorage
- Post-booking follow-up (e.g., reminder SMS/email before appointment)

---

*Last updated: 2026-03-07*
