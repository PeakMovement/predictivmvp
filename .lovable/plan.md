

## Predictiv — Full Platform Review

### What It Is

Predictiv is a **health intelligence platform** that connects to wearable devices (Oura Ring, Garmin, Polar, Fitbit) and uses AI to provide personalized health coaching, risk analysis, and training recommendations. The AI coach is called **Yves**.

### What It Aims To Be

A comprehensive health command center that:
- Ingests real-time wearable data (sleep, HRV, activity, heart rate)
- Establishes personal baselines over 30 days and detects deviations
- Assigns risk zones (green/yellow/red) based on deviation percentages
- Provides an AI health coach (Yves) with full contextual awareness of the user's health history, training phase, injuries, and goals
- Supports document intelligence (medical records, training plans)
- Enables practitioner matching and symptom triage
- Offers daily briefings, recommendations, and an insights timeline

### What Has Been Built (Version 121)

**Frontend (React + TypeScript + Tailwind + Shadcn/ui):**
- Authentication (login/register) with Supabase Auth
- 10-section onboarding profile (injuries, lifestyle, nutrition, training, medical, wellness goals, recovery, mindset, interests)
- Dashboard with daily briefing, risk score, AI recommendations, personalization insights
- Health page with score cards, trends, HRV/HR details
- Training page with calendars, accountability challenges, session comparison
- Planner with daily plan view and weekly reflections
- Yves AI chat interface (conversational + sheet overlay)
- Insights Tree (visual timeline of AI advice)
- Symptom check-in system
- Find Help / practitioner matching
- Document upload and AI analysis
- Settings with device connections, theme customization, notifications
- Admin dashboard
- Offline support, pull-to-refresh, session timeout, layout customization
- Bottom navigation with tab-based routing (not React Router for main pages)

**Backend (Supabase Edge Functions — ~60+ functions):**
- Wearable data sync: Oura, Garmin, Fitbit, Polar
- Baseline calculation (30-day rolling averages)
- Deviation detection and risk zone assignment
- AI intelligence layer (Yves chat, daily briefing, recommendations, insights tree, memory bank)
- Document analysis
- Notification system (SMS via Twilio, email summaries)
- Health anomaly detection
- Treatment plan generation
- Provider matching and triage
- Google Calendar integration
- System health monitoring

**Database (PostgreSQL via Supabase):**
- ~30+ tables covering wearable sessions, summaries, training trends, user profiles (10 tables), AI memory/history, baselines, recommendations, documents, notifications, and logs
- Row Level Security on all tables
- Realtime subscriptions for live updates

### What Has Been Struggled With

**1. Garmin Integration (Current Active Issue)**
The Garmin webhook (`garmin-webhook` edge function) is failing Garmin's Partner Verification portal with 403 errors and null responses. The root cause has been identified as **Cloudflare bot protection** sitting in front of Supabase's infrastructure, which blocks Garmin's automated verification requests before they reach the edge function. The code itself is correct — `verify_jwt = false` is set, and all code paths return HTTP 200. This is an **infrastructure-level issue** requiring Supabase support to whitelist Garmin's IP ranges.

**2. Oura Integration (Previously Resolved)**
Multiple rounds of debugging OAuth flows, token refresh, data syncing, and UI display. Documented extensively in 7+ troubleshooting files (OURA_AUTH_TROUBLESHOOTING.md, OURA_FIX_GUIDE.md, etc.).

**3. Complex State Management**
The app uses tab-based navigation via `useState` in App.tsx rather than React Router for main pages, with special-cased routes for OAuth callbacks. This creates complexity.

---

## All Garmin-Related Code

Here is every file related to the Garmin API integration:

---

### 1. `supabase/config.toml` — Garmin JWT Settings (lines 144-157)

```toml
[functions.garmin-auth-initiate]
verify_jwt = false

[functions.garmin-auth]
verify_jwt = false

[functions.fetch-garmin-data]
verify_jwt = false

[functions.fetch-garmin-auto]
verify_jwt = false

[functions.garmin-webhook]
verify_jwt = false
```

All five Garmin functions have `verify_jwt = false`.

---

### 2. `supabase/functions/garmin-auth-initiate/index.ts` (174 lines)

Initiates the Garmin OAuth 2.0 PKCE flow. Authenticates the Supabase user, generates a code_verifier/code_challenge, stores them in `garmin_oauth_state` table (10-min TTL), and returns the Garmin authorization URL.

**Key env vars:** `GARMIN_CONSUMER_KEY`, `GARMIN_REDIRECT_URI`

**Full file shown above in the tool results.**

---

### 3. `supabase/functions/garmin-auth/index.ts` (231 lines)

Handles the OAuth callback from Garmin. Validates state, retrieves PKCE code_verifier, exchanges the authorization code for tokens at `https://diauth.garmin.com/di-oauth2-service/oauth/token`, stores tokens in `wearable_tokens` (keyed on `user_id, scope='garmin'`), and redirects to the frontend.

**Key env vars:** `GARMIN_CONSUMER_KEY`, `GARMIN_CONSUMER_SECRET`, `GARMIN_REDIRECT_URI`, `FRONTEND_URL`

**Full file shown above in the tool results.**

---

### 4. `supabase/functions/garmin-webhook/index.ts` (580 lines)

Push notification webhook for Garmin Health API. Processes: dailies, sleeps, activities, activityDetails, hrvSummaries, deregistrations, userPermissionsChange. Every code path returns HTTP 200. Resolves Garmin's `userAccessToken` to internal `user_id` via the `wearable_tokens` table. After processing, triggers `calculate-oura-trends` for affected users.

**THIS IS THE FUNCTION WITH THE 403 ISSUE** — the code is correct, but Cloudflare blocks Garmin's verification requests before they reach it.

**Full file shown above in the tool results (all 580 lines).**

---

### 5. `supabase/functions/fetch-garmin-data/index.ts` (615 lines)

Pull-based data sync. Fetches last 7 days from Garmin Wellness API (`/dailies`, `/sleeps`, `/activities`), merges by date, upserts into `wearable_sessions`, calculates training trends (ACWR, strain, monotony), and upserts into `training_trends` and `wearable_summary`. Supports single-user or all-users mode. Includes token refresh logic.

**Key env vars:** `GARMIN_CONSUMER_KEY`, `GARMIN_CONSUMER_SECRET`
**API base:** `https://apis.garmin.com/wellness-api/rest`

**Full file shown above in the tool results (all 615 lines).**

---

### 6. `supabase/functions/fetch-garmin-auto/index.ts` (67 lines)

Scheduled auto-sync wrapper. Simply POSTs to `fetch-garmin-data` with no `user_id` (processes all Garmin users). Designed for cron job invocation.

**Full file shown above in the tool results.**

---

### 7. `src/components/ConnectGarminButton.tsx` (84 lines)

Frontend button component. Calls `garmin-auth-initiate` edge function, redirects to the returned `auth_url`. Shows connected/disconnected states.

**Full file shown above in the tool results.**

---

### Database Tables Used by Garmin

- **`wearable_tokens`** — Stores OAuth tokens (access_token, refresh_token, expires_at) with composite key `(user_id, scope='garmin')`
- **`garmin_oauth_state`** — Temporary PKCE state storage (state, code_verifier, expires_at) with 10-minute TTL
- **`wearable_sessions`** — Raw daily metrics with composite key `(user_id, source='garmin', date)`
- **`wearable_summary`** — Calculated metrics (strain, monotony, ACWR) with composite key `(user_id, source='garmin', date)`
- **`training_trends`** — Historical trend data with composite key `(user_id, date)`
- **`oura_logs`** — Sync operation logging (shared with Oura)

---

### The 403 Problem Summary

The `garmin-webhook` function code is correct. The 403 is produced by **Cloudflare's bot protection layer** that sits between Garmin's servers and Supabase's edge functions. Solutions:

1. **Contact Supabase support** to whitelist Garmin's IPs at the Cloudflare level
2. **Deploy a proxy** (Cloudflare Worker, Vercel, or Railway) that receives Garmin pushes and forwards them to the Supabase endpoint
3. Garmin does not publish a public IP allowlist — coordinate through Supabase support

