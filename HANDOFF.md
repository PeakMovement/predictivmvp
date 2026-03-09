# Predictiv — Developer Handoff

_Last updated: 2026-03-09_

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React 18 + TypeScript + Vite | Hosted on Netlify |
| Styling | Tailwind CSS + shadcn/ui | Dark-mode first |
| Backend | Supabase (Postgres + Edge Functions) | Deno runtime |
| AI | google/gemini-2.5-flash via Lovable gateway | Falls back to OpenAI → Anthropic → Google AI direct |
| Auth | Supabase Auth (email + OAuth) | Session timeout warning built in |
| Storage | Supabase Storage (avatars bucket) | Public bucket |
| Wearables | Oura Ring, Garmin, Polar | OAuth tokens stored in `wearable_tokens` table (referenced in migrations) |

---

## Routing

### Unauthenticated routes

| Path | Component | Description |
|------|-----------|-------------|
| `*` (default) | `Login` | Login page (catch-all for unauthenticated) |
| `/register` | `Register` | New user registration |
| `/practitioner/register` | `PractitionerRegister` | Practitioner signup |
| `/forgot-password` | `ForgotPassword` | Password reset request |
| `/terms` | `Terms` | Terms of service |
| `/privacy` | `Privacy` | Privacy policy |

### OAuth / callback routes (always accessible)

| Path | Component | Description |
|------|-----------|-------------|
| `/oauth/callback/oura` | `OuraCallback` | Oura Ring OAuth return |
| `/auth/polar` | `PolarCallback` | Polar OAuth return (`src/pages/auth/polar.tsx`) |
| `/google-calendar-callback` | `GoogleCalendarCallback` | Google Calendar OAuth return |
| `/reset-password` | `ResetPassword` | Password reset via email link |

### Authenticated routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Redirect → `/dashboard` | Root redirect |
| `/dashboard` | `Dashboard` | Main home screen with daily briefing and stats |
| `/planner` | `Planner` | Weekly training planner with drag-and-drop |
| `/training` | `Training` | Training log and session history |
| `/health` | `Health` | Health metrics, HRV, sleep, readiness |
| `/your-plan` | `YourPlan` | Current training plan view |
| `/plan-compliance` | `PlanCompliance` | Adherence tracking and compliance metrics |
| `/my-documents` | `MyDocuments` | Document upload and management |
| `/my-baselines` | `MyBaselines` | Personal 28-day rolling metric baselines |
| `/find-help` | `FindHelp` | Practitioner search and matching |
| `/symptom-checkin` | `SymptomCheckIn` | Log daily symptoms |
| `/settings` | `Settings` | App settings, wearables, notifications, account |
| `/insights-tree` | `InsightsTree` | AI insight history tree view |
| `/yves-insights` | `YvesChat` (inline) | Full-page Yves AI chat |
| `/profile-setup` | `ProfileSetup` | Initial profile configuration |
| `/admin-dashboard` | `AdminDashboard` | Admin user overview (admin-only) |
| `/personal-canvas` | `PersonalCanvas` | Personal health canvas / self-report |
| `/metrics-dashboard` | `MetricsDashboard` | Detailed metric charts and trends |
| `/alert-history` | `AlertHistory` | Health alert notification history |
| `/practitioner` | `PractitionerDashboard` | Practitioner view of patient data (role-gated) |
| `/injury-log` | `InjuryLog` | Injury tracking and management |
| `/plan` | `WeeklyPlan` | AI-generated weekly training plan |
| `/terms` | `Terms` | Terms of service (also accessible logged in) |
| `/privacy` | `Privacy` | Privacy policy (also accessible logged in) |
| `*` | Redirect → `/dashboard` | Catch-all for authenticated users |

**Note:** `YvesChatSheet` and `SymptomCheckInSheet` are persistent overlay components rendered at the layout level (not as routes), accessible from any page.

---

## Edge Functions

All functions live in `supabase/functions/`. Deploy with `supabase functions deploy <name>` or `supabase functions deploy` for all.

| Function | Description |
|----------|-------------|
| `adapt-user-model` | Updates user AI model/preferences based on feedback and behaviour |
| `admin-user-overview` | Returns aggregated user stats for admin dashboard |
| `analyze-all-user-engagement` | Batch engagement analysis across all users |
| `analyze-document` | AI-powered document analysis and insight extraction |
| `analyze-user-engagement` | Per-user engagement scoring and pattern detection |
| `backfill-memory-bank` | Retroactively populates `yves_memory_bank` from historical data |
| `build-health-profile` | Constructs `user_health_profiles` from wearable + self-report data |
| `calculate-baseline` | Computes 28-day rolling averages into `user_baselines` |
| `calculate-data-maturity` | Scores how complete a user's data profile is |
| `calculate-deviation` | Detects metric deviations from personal baselines |
| `calculate-oura-trends` | Aggregates Oura data into trend tables |
| `calculate-plan-adherence` | Scores training plan compliance |
| `calendly-webhook` | Handles Calendly booking webhooks for practitioner appointments |
| `complete-medical-session` | Finalises a medical consultation session |
| `create-booking` | Creates a practitioner booking record |
| `delete-user-account` | Hard-deletes all user data (GDPR) |
| `detect-health-anomalies` | Flags metric anomalies vs personal baselines into `health_anomalies` |
| `email-preferences` | Manages user email notification preferences |
| `evaluate-escalation-rules` | Checks escalation rule triggers and fires alerts |
| `export-user-data` | Exports all user data as JSON (GDPR) |
| `fetch-garmin-auto` | Auto-syncs Garmin data on schedule |
| `fetch-garmin-data` | Manual Garmin data fetch |
| `fetch-google-calendar-events` | Pulls Google Calendar events for planner sync |
| `fetch-oura-auto` | Auto-syncs Oura Ring data on schedule |
| `fetch-oura-data` | Manual Oura data fetch |
| `fetch-polar-exercises` | Pulls Polar exercise sessions |
| `fetch-polar-sleep` | Pulls Polar sleep data |
| `garmin-auth` | Garmin OAuth token exchange (legacy) |
| `garmin-auth-initiate` | Initiates Garmin OAuth 1.0a flow |
| `garmin-webhook` | Handles Garmin push webhook notifications |
| `generate-daily-briefing` | AI-generates personalised daily briefing (full + category mini-briefings) |
| `generate-insights` | Generates AI insights stored in `insight_history` |
| `generate-treatment-plan` | Creates structured treatment plan for injury/rehab |
| `generate-weekly-challenges` | Generates weekly accountability challenges |
| `generate-weekly-plan` | AI-generates a 7-day structured training plan |
| `generate-yves-intelligence` | Larger intelligence pipeline combining all Yves signals |
| `generate-yves-recommendations` | Generates 3 structured daily recommendations stored to `yves_recommendations` |
| `get-activity-trends` | Returns aggregated activity trend data |
| `get-bookings` | Returns practitioner bookings for a user |
| `get-daily-health-trends` | Returns daily health trend data |
| `get-medical-session` | Retrieves a medical session record |
| `get-recovery-trends` | Returns recovery trend data |
| `get-weekly-health-trends` | Returns weekly aggregated health trends |
| `google-calendar-auth-callback` | Google Calendar OAuth callback handler |
| `google-calendar-auth-initiate` | Initiates Google Calendar OAuth flow |
| `health-check` | System health check (DB + AI provider connectivity) |
| `identify-risk-drivers` | Identifies root-cause risk factors from health data |
| `interpret-health-event` | AI interpretation of a specific health event/anomaly |
| `lovable-ai-credits` | Checks/manages Lovable AI API credit balance |
| `manage-challenge-lifecycle` | Lifecycle management for weekly challenges (activate/close/score) |
| `match-provider` | Matches users to practitioners based on needs |
| `oura-auth` | Oura OAuth token exchange |
| `oura-auth-initiate` | Initiates Oura OAuth flow |
| `oura-auth-test` | Debug endpoint to test Oura auth configuration |
| `oura-webhook` | Handles Oura Ring real-time webhook pushes |
| `oura-webhook-setup` | Registers/manages Oura webhook subscription |
| `physician-match-advanced` | Advanced physician matching with scoring algorithm |
| `polar-auth-callback` | Polar OAuth callback handler |
| `polar-auth-initiate` | Initiates Polar OAuth flow |
| `predict-provider` | Predicts best practitioner match using ML-style scoring |
| `record-feedback` | Stores user feedback on AI recommendations |
| `save-medical-session` | Saves/updates a medical consultation session |
| `seed-physicians` | Seed script to populate physician directory |
| `send-booking-confirmation` | Sends booking confirmation email via Resend |
| `send-daily-summary-email` | Sends daily health summary email via Resend |
| `send-practitioner-invite` | Emails practitioner invite link |
| `send-risk-email` | Sends risk alert email via Resend |
| `send-sms-alert` | Sends SMS alerts via Twilio |
| `symptom-analysis` | AI analysis of logged symptoms |
| `sync-calendar-to-planner` | Syncs Google Calendar events into the planner |
| `system-health-check` | Comprehensive system diagnostics |
| `test-twilio-env` | Debug endpoint to verify Twilio credentials |
| `track-engagement` | Records engagement events |
| `trigger-risk-alert` | Fires risk alert pipeline (email + SMS + popup) |
| `wearable-diagnostics` | Diagnostic info for wearable connections |
| `wearables` | Shared wearable utility module (token refresh, diagnostics) |
| `yves-chat` | Streaming AI chat with Yves persona |
| `yves-memory-update` | Updates Yves memory bank with new learnings |
| `yves-tree` | Returns insight tree data for InsightsTree page |

**Deploy command:** `supabase functions deploy <name>`
**Deploy all:** `supabase functions deploy`

---

## Environment Variables / Secrets

### Supabase Edge Function Secrets (set via `supabase secrets set KEY=value`)

| Secret | Used By | Notes |
|--------|---------|-------|
| `SUPABASE_URL` | All functions | Auto-injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | All functions | Auto-injected by Supabase runtime |
| `SUPABASE_ANON_KEY` | `save-medical-session`, `complete-medical-session`, `get-medical-session`, `create-booking`, `get-bookings` | Auto-injected |
| `LOVABLE_API_KEY` | `generate-daily-briefing`, `generate-yves-intelligence`, `generate-weekly-challenges`, `interpret-health-event`, `lovable-ai-credits`, `_shared/ai-provider.ts` | Primary AI key — Lovable gateway to Gemini 2.5 Flash |
| `OPENAI_API_KEY` | `symptom-analysis`, `generate-treatment-plan`, `generate-yves-intelligence`, `_shared/ai-provider.ts` | AI fallback / some dedicated functions |
| `ANTHROPIC_API_KEY` | `_shared/ai-provider.ts` | AI fallback (not primary) |
| `GOOGLE_AI_API_KEY` | `_shared/ai-provider.ts` | AI fallback (not primary) |
| `AI_PROVIDER` | `health-check`, `_shared/ai-provider.ts` | Optional override: `lovable`, `openai`, `anthropic`, `google` |
| `OURA_CLIENT_ID` | `oura-auth`, `oura-auth-initiate`, `oura-auth-test`, `oura-webhook-setup`, `_shared/oura-token-refresh.ts` | Oura Ring OAuth |
| `OURA_CLIENT_SECRET` | `oura-auth`, `oura-webhook`, `oura-webhook-setup`, `_shared/oura-token-refresh.ts` | Oura Ring OAuth |
| `OURA_REDIRECT_URI` | `oura-auth`, `oura-auth-initiate` | Oura OAuth redirect |
| `OURA_WEBHOOK_VERIFICATION_TOKEN` | `oura-webhook`, `oura-webhook-setup` | Oura webhook signature verification |
| `GARMIN_CONSUMER_KEY` | `fetch-garmin-data`, `garmin-auth`, `garmin-auth-initiate` | Garmin OAuth 1.0a |
| `GARMIN_CONSUMER_SECRET` | `fetch-garmin-data`, `garmin-auth` | Garmin OAuth 1.0a |
| `GARMIN_REDIRECT_URI` | `garmin-auth`, `garmin-auth-initiate` | Garmin OAuth redirect |
| `POLAR_CLIENT_ID` | `polar-auth-callback`, `polar-auth-initiate` | Polar Flow OAuth |
| `POLAR_CLIENT_SECRET` | `polar-auth-callback` | Polar Flow OAuth |
| `GOOGLE_CLIENT_ID` | `fetch-google-calendar-events`, `google-calendar-auth-callback`, `google-calendar-auth-initiate` | Google Calendar OAuth |
| `GOOGLE_CLIENT_SECRET` | `fetch-google-calendar-events`, `google-calendar-auth-callback` | Google Calendar OAuth |
| `GOOGLE_REDIRECT_URI` | `google-calendar-auth-callback`, `google-calendar-auth-initiate` | Google OAuth redirect |
| `TWILIO_ACCOUNT_SID` | `send-sms-alert`, `test-twilio-env` | SMS alerts |
| `TWILIO_AUTH_TOKEN` | `send-sms-alert`, `test-twilio-env` | SMS alerts |
| `TWILIO_PHONE_NUMBER` | `send-sms-alert`, `test-twilio-env` | SMS sender number |
| `TWILIO_REGION` | `test-twilio-env` | Optional Twilio region |
| `RESEND_API_KEY` | `send-risk-email`, `send-booking-confirmation`, `send-daily-summary-email`, `calendly-webhook` | Transactional email |
| `RESEND_FROM` | `send-daily-summary-email` | Optional from address override |
| `RESEND_TO_OVERRIDE` | `send-daily-summary-email` | Optional dev email override |
| `CALENDLY_WEBHOOK_SIGNING_KEY` | `calendly-webhook` | Calendly webhook verification (optional) |
| `APP_URL` | `send-practitioner-invite` | App base URL (defaults to `https://predictiv.netlify.app`) |
| `FRONTEND_URL` | `garmin-auth` | Frontend base URL (defaults to `https://predictiv.netlify.app`) |

### Frontend (.env)

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

---

## Database Tables

All tables are in the `public` schema unless noted. 118 migration files total.

### Core User Tables
| Table | Description |
|-------|-------------|
| `user_profiles` | Core profile: name, age, sport, onboarding status, timezone |
| `user_context` | Legacy context store (superseded by `user_context_enhanced`) |
| `user_context_enhanced` | Rich context: injuries, goals, training history, preferences |
| `user_health_profiles` | Health metadata: conditions, medications, allergies |
| `user_training` | Training prefs: preferred activities, frequency, intensity, current phase |
| `user_lifestyle` | Lifestyle: stress level, work schedule, daily routine |
| `user_interests` | Hobbies and interests arrays |
| `user_wellness_goals` | Goals with target date and priority |
| `user_medical` | Medical history |
| `user_nutrition` | Nutrition preferences and habits |
| `user_mindset` | Mental health and mindset notes |
| `user_recovery` | Recovery modalities and preferences |
| `user_injury_profiles` | Active injury profiles per user |
| `user_injuries` | Injury event log |
| `user_roles` | Role assignments (admin, practitioner, user) |
| `user_adaptation_profile` | AI model adaptation state per user |
| `user_data_maturity` | Data completeness scoring |
| `user_focus_preferences` | Focus mode settings |
| `user_shown_patterns` | Tracks which insights have been shown to avoid repetition |
| `user_treatment_preferences` | Preferred treatment modalities |

### Wearable Data Tables
| Table | Description |
|-------|-------------|
| `wearable_sessions` | Daily wearable sessions: HRV, sleep score, readiness, HR, SpO2, steps |
| `wearable_summary` | Aggregated wearable summary per user |
| `oura_tokens` | Oura Ring OAuth tokens |
| `oura_activity` | Oura daily activity data |
| `oura_sleep` | Oura sleep staging and scores |
| `oura_readiness` | Oura readiness scores |
| `oura_cardiovascular_age` | Oura cardiovascular age estimates |
| `oura_resilience` | Oura resilience scores |
| `oura_rest_mode` | Oura rest mode events |
| `oura_ring_config` | Oura ring configuration |
| `oura_spo2` | Oura blood oxygen data |
| `oura_stress` | Oura daytime stress scores |
| `oura_vo2max` | Oura VO2 Max estimates |
| `oura_workout` | Oura workout sessions |
| `oura_logs` | Oura API sync logs |
| `polar_tokens` | Polar Flow OAuth tokens |
| `polar_webhooks` | Polar webhook registrations |
| `polar_logs` | Polar API sync logs |
| `fitbit_tokens` | Fitbit OAuth tokens (integration present but not actively marketed) |
| `fitbit_auto_data` | Fitbit auto-sync data |
| `fitbit_trends` | Fitbit trend data |
| `garmin_oauth_state` | Garmin OAuth PKCE state |

### Analytics / Trend Tables
| Table | Description |
|-------|-------------|
| `activity_trends` | Aggregated activity metrics over time |
| `recovery_trends` | Recovery trend data: chronic/acute load, ACWR, recovery score |
| `health_trends_daily` | Daily health trend snapshots |
| `health_trends_weekly` | Weekly aggregated health trends |
| `health_anomalies` | Flagged metric anomalies vs personal baselines |
| `plan_adherence` | Training plan adherence records |

### AI / Yves Tables
| Table | Description |
|-------|-------------|
| `insight_history` | Historical AI insights shown to user |
| `yves_recommendations` | Structured recommendations from Yves (3 per cycle) |
| `yves_memory_bank` | Yves persistent memory across sessions |
| `daily_briefings` | Cached daily briefings per user |
| `document_insights` | AI-extracted insights from uploaded documents |
| `prompt_history` | History of AI prompts sent |
| `recommendation_outcomes` | User feedback/outcomes on recommendations |

### Document / Data Tables
| Table | Description |
|-------|-------------|
| `user_documents` | User-uploaded health documents (references Storage) |
| `document_versions` | Document version history |
| `document_processing_log` | Document analysis processing log |
| `csv_uploads` | CSV data uploads |

### Alerts / Escalation Tables
| Table | Description |
|-------|-------------|
| `alert_history` | History of health alerts fired |
| `alert_settings` | User alert preferences and thresholds |
| `escalation_rules` | Configurable escalation rule definitions |
| `escalation_log` | Log of escalation rule triggers |
| `risk_trajectories` | Risk trend projections |
| `risk_alert_dismissals` | Tracks which risk alerts a user has dismissed |

### Symptom / Clinical Tables
| Table | Description |
|-------|-------------|
| `symptom_check_ins` | Daily symptom check-in records |
| `triage_results` | AI triage outcomes from symptom analysis |
| `treatment_plans` | AI-generated treatment plans |
| `treatment_plan_services` | Services included in treatment plans |
| `treatment_plan_feedback` | User feedback on treatment plans |

### Practitioner / Booking Tables
| Table | Description |
|-------|-------------|
| `practitioners` | Practitioner profiles (via Supabase auth linkage) |
| `healthcare_practitioners` | Extended practitioner data: specialties, location, Calendly URL |
| `practitioner_specialties` | Specialty tags for practitioners |
| `practitioner_bookings` | Booking records between users and practitioners |
| `service_categories` | Categories of practitioner services |
| `physicians` | Seed physician directory |
| `medical_finder_sessions` | Sessions from the "find help" AI-assisted search |
| `provider_reviews` | User reviews of practitioners |
| `review_helpful_votes` | Helpful votes on reviews |

### Calendar / Planning Tables
| Table | Description |
|-------|-------------|
| `google_calendar_tokens` | Google Calendar OAuth tokens |
| `google_calendar_events` | Synced Google Calendar events |
| `google_calendar_sync_logs` | Sync operation logs |

### Engagement / Gamification Tables
| Table | Description |
|-------|-------------|
| `engagement_events` | User activity events for engagement scoring |
| `accountability_challenges` | Weekly accountability challenge definitions |
| `user_challenges` | User participation in challenges |
| `weekly_reflections` | Weekly reflection journal entries |

### System / Infrastructure Tables
| Table | Description |
|-------|-------------|
| `rate_limits` | API rate limiting counters |
| `rate_limit_state` | Extended rate limit state tracking |
| `sync_health_log` | Wearable sync health monitoring |
| `sync_retry_queue` | Failed sync retry queue |
| `function_execution_log` | Edge function execution audit log |
| `notification_log` | Notification delivery log |
| `user_focus_preferences` | User focus mode/UI preferences |
| `user_shown_patterns` | Deduplication tracking for insight delivery |

**Note:** `wearable_tokens` (referenced in code and later migrations like `20260308000002_add_status_to_wearable_tokens.sql`) was created via an earlier migration not named with `CREATE TABLE` — it exists in the live DB, referenced extensively in edge functions. `user_baselines` and `training_trends` tables are also referenced in edge functions but their CREATE TABLE migrations appear in the earlier UUID-named migration files.

---

## Known Issues

### Build
- **Build passes with 0 errors.** No TypeScript errors were found during the audit (`npm run build` succeeded cleanly).
- One Vite warning: `YvesChat.tsx` is both dynamically imported by `App.tsx` and statically imported by `YvesChatSheet.tsx`. This is a build performance warning, not an error — the dynamic chunk won't be split as intended. Not a functional issue.
- Three JS chunks exceed 500KB (Recharts, jsPDF, html2canvas). These are performance warnings only.

### Routes
- All route component files verified to exist. No missing files found.

### Functional Notes
- `practitioner_access` table is referenced in `App.tsx` with `as any` cast, indicating it may not be in the TypeScript database types yet.
- Fitbit integration tables exist in migrations but there is no frontend Fitbit connection flow or edge function for fetch — appears to be stubbed/abandoned.

---

## Pending / Incomplete Features

Based on code inspection:

1. **Fitbit integration** — Tables (`fitbit_tokens`, `fitbit_auto_data`, `fitbit_trends`) exist but no frontend connection flow or active fetch functions. Likely deprioritised.

2. **`practitioner_access` table** — Used in `App.tsx` to gate the practitioner dashboard button, but queried with `as any` TypeScript cast, meaning it's not in the generated Supabase types. May be missing from migrations or added directly to the DB.

3. **`user_baselines` and `training_trends` tables** — Referenced extensively in all three Yves AI edge functions but no `CREATE TABLE` statement was found in named migration files. These may have been created via anonymous UUID migrations or directly in the DB.

4. **`oura-auth-test` function** — Debug/diagnostic endpoint, not for production use. Should be removed or protected before public launch.

5. **`test-twilio-env` function** — Another debug-only endpoint. Should be removed or protected.

6. **`seed-physicians` function** — One-time seed script. Should not be callable in production.

7. **Weekly Challenges** (`generate-weekly-challenges`, `manage-challenge-lifecycle`) — Challenge tables exist, edge functions exist, but no dedicated frontend page for challenges was found in the routes.

8. **`PersonalCanvas` page** — Exists as a route (`/personal-canvas`) but is not in the bottom navigation — only reachable via settings or direct URL.

9. **`DeveloperBaselinesEngine.tsx`** and `AuthTest.tsx`, `OuraConnectionTest.tsx`, `OuraDataTest.tsx`, `OuraDiagnostics.tsx`, `TestSupabase.tsx` — Developer/debug pages exist in `src/pages/` but have no routes in `App.tsx`. They are effectively dead code in production.

---

## Recent Development (last 20 commits)

```
192ccae feat: plan page with Yves weekly plan
5d0dded feat: injury log page
c54f65c feat: profile page full build
d8603a8 feat: yves chat context + suggested prompts
3793ac0 feat: injury log + plan page
6e2db09 Improve booking actions layout
4627a0c Refined booking dialog buttons
5ef6850 Fix email icon and button size
975bf4c Fix email icon and button
0c9480e Inline Call Email icons fix
28b1f44 Fix inline contact buttons
660616d Preceding changes
fab79a3 Remove profile view card
7167d3e Remove View in Profile section
e1e6523 Cleaned BookingLayout inline buttons
3198d43 Cleanup booking dialog UI and baselines fix
379a2f8 Fix booking dialog and baselines page
58e8d28 Preceding changes
1065b73 Preceding changes
9ef9e1c Save plan in Lovable
```

---

## Deployment

### Frontend (Netlify)
- **Build command:** `npm run build`
- **Publish directory:** `dist`
- **Node version:** 18+
- **Config file:** `netlify.toml` exists in root
- **Live URL:** `https://predictiv.netlify.app`

### Backend (Supabase)
- **Project ref:** `ixtwbkikyuexskdgfpfq`
- **Push migrations:** `supabase db push`
- **Deploy all functions:** `supabase functions deploy`
- **Deploy single function:** `supabase functions deploy <function-name>`
- **Set secrets:** `supabase secrets set KEY=value`
- **Link project:** `supabase link --project-ref ixtwbkikyuexskdgfpfq`

### Shared Edge Function Utilities (`supabase/functions/_shared/`)
- `ai-provider.ts` — AI provider abstraction (Lovable → OpenAI → Anthropic → Google)
- `rate-limiter.ts` — Request rate limiting
- `oura-token-refresh.ts` — Oura OAuth token refresh logic
- `cors.ts` — CORS headers helper

### Cron Jobs
Scheduled jobs are configured in `supabase/migrations/20260305000000_setup_cron_jobs.sql` and `20260306000002_schedule_garmin_auto_sync.sql`. These include auto-syncs for Oura and Garmin data.
