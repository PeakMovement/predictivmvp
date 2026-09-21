# Predictiv MVP — Critical Value Inventory

**Repo:** [PeakMovement/predictivmvp](https://github.com/PeakMovement/predictivmvp)  
**Audit date:** 21 September 2026  
**Scope:** Read-only inventory of everything Justin paid for so it is not silently left behind when Predictiv Finder moves to Lovable Cloud first, then this app.  
**Verdict:** This **is** Old Predictiv (the heavy edge-function health OS). It is **not** the wrong repo.

---

## How to read this document

| Tag | Meaning |
|-----|---------|
| **ANALYSIS** | Encodes paid data-analysis / scoring / matching / plan / triage work. Must not be dropped without an explicit decision. |
| **MUST-CARRY** | Unique to this repo; Finder does not have it. Losing it means losing paid IP or live user history. |
| **NICE-TO-CARRY** | Useful, but rebuildable or partially duplicated. |
| **OBSOLETE** | Dead, stubbed, synthetic, or superseded. Do not migrate as-is. |
| **FINDER** | Already exists (or is being rebuilt) in PeakMovement/predictiv-finder. |

**Not in this git repo (still valuable):** live Supabase data (wearable history, Yves memory, profiles), OAuth secrets, and the **M2 / Onboarding Decision Map PDF** that the Life Formula scorer cites but does not include.

---

## 1. What this product is

This is **Predictiv Health** — an authenticated, wearable-connected **health intelligence OS** with an AI coach named **Yves**. It is a Lovable-origin React app (`lovable.dev/projects/496b78dd-5429-4d22-8cdf-157ebd1425c9`) deployed on **Netlify** (`predictiv.netlify.app`), backed by **Supabase** (Postgres + Auth + Storage + Deno Edge Functions + pg_cron).

It is **not** the public Cape Town practitioner directory. That product is **Predictiv Finder** (`PeakMovement/predictiv-finder`, live at https://predictiv.co.za). There is **no** `PeakMovement/Predictiv` repository.

### Architecture (this repo)

| Layer | What it is |
|-------|------------|
| Frontend | React 18 + TypeScript + Vite + Tailwind + shadcn/ui. Path alias `@/` → `src/`. |
| Routing | React Router; auth gate → onboarding → authenticated shell. |
| Server state | TanStack Query. |
| Backend | Supabase Postgres + **87** Deno edge functions + **138** SQL migrations. |
| AI | Lovable gateway → Gemini 2.5 Flash, with fallback OpenAI → Anthropic → Google (`_shared/ai-provider.ts`). |
| Wearables | **Oura** (OAuth 2 + webhooks), **Garmin** (OAuth 2 PKCE + Wellness API + webhook), **Polar** (OAuth 2 + exercises/sleep). Fitbit tables exist; **no live Fitbit fetch**. |
| Calendar / booking | Google Calendar OAuth + event create; Calendly webhook; practitioner bookings. |
| Alerts | Resend email + Twilio SMS (**+27 only**). |
| Charts / export | Recharts, html2canvas, PapaParse (CSV). |
| Tests | Vitest + Playwright. |
| Extra | One Netlify function: `netlify/functions/garmin-webhook.ts`. OpenAPI spec: `openapi.yaml`. |

**History:** ~1,314 commits, first recorded 27 Sep 2025, last `main` commit **17 Jul 2026**. Finder was still being updated on **20 Sep 2026**. This codebase is the older, heavier product.

### What the app does (product surface)

Authenticated user journey:

1. Sign up / login (email + OAuth).  
2. **Genesis / 7-question onboarding** → writes `onboarding_signals` that pick a **Life Formula**.  
3. Connect Oura / Garmin / Polar.  
4. Nightly/hourly sync → `wearable_sessions` → baselines, ACWR/strain/monotony, deviations, anomalies, risk.  
5. **Dashboard:** daily briefing, Yves recommendations, risk score.  
6. **Health / Training / Planner / Weekly Plan / Plan Compliance.**  
7. **Yves chat** (sheet + full page) with memory bank + layered reasoning.  
8. **Find Help** — AI triage → rank `/public/practitioners.csv`.  
9. Symptom check-in, injury log, documents + AI analysis, personal canvas, insights tree, admin + practitioner dashboards.

This is a **logged-in coaching + load-management product**. Finder is a **public “who to see” directory**. They share a brand and a SA sports-health domain; they do **not** share a schema or a function set.

---

## 2. All edge functions (87)

Count: **87 function directories** under `supabase/functions/` (plus `_shared/`). `supabase/config.toml` lists **65** `[functions.*]` entries — some newer functions exist on disk but are not in config.

**ANALYSIS flags** mark scoring, ML-style ranking, physician matching, triage, CSV pipelines, health plans, or wearable science.

### 2.1 ANALYSIS — scoring, ML, matching, triage, plans, science

| Function | Purpose | Flag |
|----------|---------|------|
| `calculate-baselines` | **M2 baseline engine.** 7d/30d HRV, RHR, sleep, load, ACWR, recovery trend, anomaly score, HRV streak, weekly load progression, monotony (F-04). Writes `baseline_profiles`. Cron daily 05:00 UTC. | **ANALYSIS / MUST-CARRY** |
| `calculate-life-formulas` | **M2 Life Formula engine.** Scores LF-01…LF-10 from onboarding signals + device exclusions. Point system copied from the **Onboarding Decision Map (Scenario Selections PDF)**. Writes `user_life_formula`. | **ANALYSIS / MUST-CARRY** |
| `calculate-oura-trends` | ACWR, strain, monotony, **EWMA λ=0.28**, data-gap flags → `training_trends` / `recovery_trends`. Core training-load science. | **ANALYSIS / MUST-CARRY** |
| `calculate-baseline` | Older 30-day rolling averages into `user_baselines` (Fitbit-era comments remain). Overlapped by M2 `calculate-baselines`. | **ANALYSIS** (carry formulas, not both pipelines) |
| `calculate-deviation` | Latest metrics vs personal baselines → `user_deviations` / risk zones. | **ANALYSIS / MUST-CARRY** |
| `calculate-data-maturity` | Scores how complete a user’s data profile is → `user_data_maturity`. | **ANALYSIS** |
| `calculate-plan-adherence` | Scores training-plan compliance → `plan_adherence`. **No UI trigger today** (known gap). | **ANALYSIS** |
| `identify-risk-drivers` | Root-cause ranking: ACWR, monotony, strain, fatigue index, HRV deviation, sleep, symptoms. User `alert_settings` override hardcoded thresholds. | **ANALYSIS / MUST-CARRY** |
| `detect-health-anomalies` | Research-style % spike/drop thresholds (HRV, RHR, sleep, readiness, activity) → `health_anomalies`. Cron daily 07:00 UTC. | **ANALYSIS / MUST-CARRY** |
| `analyze-user-patterns` | **M2 weekly pattern analysis** over wearable_sessions + baseline_profiles. Cron Sunday 04:00 UTC. | **ANALYSIS / MUST-CARRY** |
| `analyze-user-engagement` | Per-user engagement scoring. | **ANALYSIS** |
| `analyze-all-user-engagement` | Batch engagement analysis across users. | **ANALYSIS** |
| `adapt-user-model` | Updates AI adaptation profile from feedback/behaviour. Cron weekly; **HANDOFF says it never actually runs from UI**. | **ANALYSIS** |
| `evaluate-escalation-rules` | Evaluates `escalation_rules` and fires alerts. Table often empty. | **ANALYSIS** |
| `match-provider` | AI tool-call `parse_symptom_query` → SA professional types, severity, red flags, urgency, ZAR budget, location. Frontend then ranks **CSV**. | **ANALYSIS / MUST-CARRY** (triage IP) |
| `predict-provider` | ML-style specialty mapping + AI ranking (GP, physio, sports med, cardio, sleep, nutrition, psych, ortho, emergency) → `triage_results`. | **ANALYSIS / MUST-CARRY** |
| `physician-match-advanced` | Scores DB `physicians` on specialty, urgency/availability, cost tier, telehealth, location. | **ANALYSIS** (algorithm yes; **data is US synthetic**) |
| `seed-physicians` | One-shot seed of **US fake doctors** (Harvard/UCLA, +1-555…). | **OBSOLETE data**; do not treat as paid directory |
| `generate-treatment-plan` | AI structured treatment/rehab plan → `treatment_plans`. | **ANALYSIS / MUST-CARRY** |
| `generate-weekly-plan` | Rule engine: Rest/Easy/Moderate/Hard from yesterday’s load, 7d avg, low-load streaks. | **ANALYSIS / MUST-CARRY** |
| `generate-weekly-challenges` | AI weekly accountability challenges. | NICE-TO-CARRY |
| `symptom-analysis` | AI analysis of logged symptoms. | **ANALYSIS** |
| `interpret-health-event` | AI interpretation of a symptom check-in against full health context. | **ANALYSIS** |
| `generate-insights` | AI insights from deviation data → `insight_history`. | **ANALYSIS** |
| `generate-daily-briefing` | Personalised daily briefing (full + category minis) from ~16 data sources. ~1,473 lines. | **ANALYSIS / MUST-CARRY** (prompt + pipeline) |
| `generate-yves-recommendations` | Three structured daily recommendations vs baselines. | **ANALYSIS / MUST-CARRY** |
| `generate-yves-intelligence` | Full Yves pipeline: focus modes + **4-layer reasoning** + briefing + recs. ~1,568 lines. | **ANALYSIS / MUST-CARRY** |
| `yves-chat` | Streaming Yves chat with full profile/wearable/baseline context. ~1,086 lines. | **ANALYSIS / MUST-CARRY** (persona + prompts) |
| `yves-memory-update` | Writes learnings into `yves_memory_bank`. | MUST-CARRY |
| `yves-tree` | Insight-tree payload. **UI currently unused** (placeholder tree). | NICE-TO-CARRY |
| `genesis-onboarding` | Backend for Genesis onboarding → signals that drive Life Formulas. | **ANALYSIS / MUST-CARRY** |
| `build-health-profile` | Builds `user_health_profiles` from wearable + self-report. | MUST-CARRY |
| `trigger-risk-alert` | Risk pipeline (email + SMS + popup). | MUST-CARRY (wire to `alert_settings`) |

### 2.2 Wearable ingest (carry the working integrations; science lives above)

| Function | Purpose |
|----------|---------|
| `fetch-oura-data` | Manual Oura v2 sync (readiness, sleep, activity, SpO2) → `wearable_sessions` + load metrics. |
| `fetch-oura-auto` | Hourly Oura sync for all token holders. |
| `oura-auth` / `oura-auth-initiate` | Oura OAuth token exchange / start. |
| `oura-auth-test` | **Debug-only** Oura config test. |
| `oura-webhook` / `oura-webhook-setup` | Oura push webhook + subscription setup. |
| `fetch-garmin-data` | Garmin Wellness dailies/sleeps/activities; ACWR via `active_calories/100`. |
| `fetch-garmin-auto` | Scheduled Garmin sync wrapper. |
| `garmin-auth` / `garmin-auth-initiate` | Garmin OAuth 2 PKCE. |
| `garmin-webhook` | Garmin Health API push (historically blocked by Cloudflare in front of Supabase). |
| `fetch-polar-exercises` / `fetch-polar-sleep` / `fetch-polar-auto` | Polar exercise + sleep ingest; auto every 4h. |
| `polar-auth-initiate` / `polar-auth-callback` | Polar Flow OAuth. |
| `wearable-diagnostics` | Token / API / coverage debug. |
| `wearables` | Shared module: fetch, diagnostics, token refresh (not a single HTTP product feature). |

### 2.3 Calendar, booking, notifications, GDPR, ops

| Function | Purpose |
|----------|---------|
| `google-calendar-auth-initiate` / `google-calendar-auth-callback` | Google Calendar OAuth. |
| `fetch-google-calendar-events` / `google-calendar-create-event` / `sync-calendar-to-planner` | Read/write calendar; planner sync (**Planner UI still a placeholder**). |
| `calendly-webhook` | HMAC-verified Calendly `invitee.created` → booking + email. |
| `create-booking` / `get-bookings` / `send-booking-confirmation` | In-app booking records + Resend confirm. |
| `save-medical-session` / `get-medical-session` / `complete-medical-session` | Medical consultation session CRUD (**little/no dedicated UI**). |
| `send-practitioner-invite` | Email practitioner invite. |
| `send-daily-summary-email` / `send-risk-email` / `send-sms-alert` | Resend + Twilio. |
| `email-preferences` | Notification prefs (partially mock). |
| `notify-signup` | Signup notification. |
| `export-user-data` / `delete-user-account` | GDPR export / hard delete. |
| `track-engagement` / `record-feedback` | Engagement events + rec feedback. |
| `backfill-memory-bank` | Retrofill Yves memory from symptoms. |
| `admin-user-overview` | Admin aggregated stats. |
| `manage-challenge-lifecycle` | Activate / expire / score challenges. |
| `get-activity-trends` / `get-daily-health-trends` / `get-weekly-health-trends` / `get-recovery-trends` | Read APIs for trend tables. |
| `analyze-document` | AI extract from uploaded medical/training docs. |
| `lovable-ai-credits` | Gateway credit check. |
| `health-check` / `system-health-check` | DB/AI/sync health. |
| `stripe-webhook` | **Scaffold only** → `user_subscriptions`. |
| `test-twilio-env` | **Debug-only.** |

### 2.4 Shared modules (`supabase/functions/_shared/`) — high IP density

| File | Lines | What it encodes |
|------|------:|-----------------|
| `layered-reasoning.ts` | 469 | **4-layer gate before Yves speaks:** physiology → risk trajectory → behaviour/psychology → interests/adherence. Silence + justification rules. **ANALYSIS / MUST-CARRY** |
| `focus-mode-prompts.ts` | 210 | Recovery / performance / pain / balance / custom metric weights + system-prompt additions. **ANALYSIS / MUST-CARRY** |
| `ai-provider.ts` | 321 | Provider fallback chain. |
| `oura-token-refresh.ts` | 500 | Oura token machinery. |
| `sanitization.ts` | 282 | Prompt/PII sanitisation. |
| `rate-limiter.ts` | 162 | Per-user AI rate limits. |
| `cache.ts` | 102 | Function cache. |

### 2.5 Scheduled jobs (pg_cron) — the “setup” Justin paid to have running

From migrations (live DB may differ after later “dead cron” fixes on `main`):

| Job | Schedule | Function |
|-----|----------|----------|
| `calculate-baselines-daily` | `0 5 * * *` | M2 baselines |
| `analyze-user-patterns-weekly` | `0 4 * * 0` | M2 patterns |
| `detect-health-anomalies-daily` | `0 7 * * *` | Anomalies |
| `adapt-user-model-weekly` | `0 3 * * 0` | User model |
| Polar auto | every 4 hours | `fetch-polar-auto` |
| Garmin auto | every 4 hours | `fetch-garmin-auto` |
| Oura auto | hourly (older Fitbit-era crons also exist) | `fetch-oura-auto` |

**Latest `main` commit already includes “Five fixes: dead/broken crons…”** — migrate the *current* cron map from production, not only these SQL files.

---

## 3. Database schema / migrations / seed — paid analysis in tables

- **138** migrations in `supabase/migrations/`.  
- Generated types (`src/integrations/supabase/types.ts`) list **90 public tables**. Types are **stale**: later M2 tables (`onboarding_signals`, `baseline_profiles`, `user_life_formula`, extra F-columns) exist in SQL but not in the generated client types.

### 3.1 Tables that encode analysis IP (not just CRUD)

| Table / cluster | What was paid for |
|-----------------|-------------------|
| `baseline_profiles` | Daily M2 signal sheet: acute/chronic avgs, ACWR zones (0.8–1.3 / 1.3–1.5 / >1.5), recovery trend, anomaly score, HRV streak, load progression, monotony F-04, F-06 HRV suppression, F-10 sleep debt, F-12 temperature deviation (Oura Gen3+), F-14 allostatic load, F-19 readiness composite, `available_formulas[]`. |
| `user_life_formula` | LF-01…LF-10 scores, ranks (primary + secondaries), device constraints. |
| `onboarding_signals` | 7-question map (wearable, training type, stress 1–10, sleep quality, Yves compliance, ≤2 health goals, injury history) + generated boolean flags the scorer consumes. |
| `user_baselines` / `user_deviations` / `yves_profiles` | Older baseline/deviation/risk-status model still used by Yves. |
| `wearable_sessions` / `wearable_summary` | Unified daily metrics + strain/monotony/ACWR. |
| `training_trends` / `recovery_trends` / `activity_trends` / `health_trends_*` | ACWR, EWMA, chronic/acute load, data_gap. |
| `health_anomalies` / `risk_score_history` / `risk_trajectories` | Anomaly + persisted risk score (fixed 2026-03-09). |
| `alert_settings` / `alert_history` / `escalation_rules` / `escalation_log` | Thresholds and escalation (rules often empty). |
| `triage_results` / `medical_finder_sessions` | Stored triage / find-help sessions. |
| `treatment_plans` / `treatment_plan_services` / `treatment_plan_feedback` | Plan graph + ZAR-oriented services. |
| `physicians` / `healthcare_practitioners` / `practitioner_specialties` / `service_categories` | Matching schema. **Content is not the live Finder directory.** |
| `csv_uploads` | CSV ingest audit (pipeline exists; no notebook). |
| `yves_memory_bank` / `yves_recommendations` / `insight_history` / `daily_briefings` / `prompt_history` | Yves IP + per-user history. |
| `plan_adherence` / `accountability_challenges` / `user_challenges` | Plan/gamification scoring. |
| 10× profile slices (`user_training`, `user_lifestyle`, `user_medical`, `user_nutrition`, `user_mindset`, `user_recovery`, `user_interests`, `user_wellness_goals`, `user_injuries`, `user_health_profiles`, …) | Deep intake Justin paid to design. |

### 3.2 Seed / CSV datasets in *this* repo

| Asset | Rows / nature | Value? |
|-------|----------------|--------|
| `public/practitioners.csv` | **28** SA-looking people (4 each of physio, biokineticist, sports doctor, GP, dietitian, S&C, run coach). Phones are `+27 xx 555 …`, emails are invented. | **Demo fixtures, not a paid real directory.** Keep as *schema of fields + ranking client*. Do not treat as customer-facing listings. |
| `seed-physicians` | US synthetic (NY/LA/Chicago, 555 numbers, Harvard/UCLA). | **OBSOLETE.** Finder has real Rondebosch listings. |
| No `.ipynb`, no `.pdf`, no `.xlsx` in git. | — | Source **Scenario Selections PDF / M2 spec** is **outside this repo**. Find it in Drive/email or it is only encoded in TypeScript. |

### 3.3 Production data (not in git) — highest operational risk

If this Supabase project is frozen without export, Justin also loses:

- Every user’s Oura/Garmin/Polar history  
- `yves_memory_bank` and briefing/recommendation history  
- Onboarding answers + Life Formula assignments  
- Symptom check-ins, documents, bookings  
- OAuth refresh tokens (users must reconnect if the project is abandoned)

**MUST-CARRY operationally:** `export-user-data` exists; run a project-level dump before shelving.

---

## 4. Docs, prompts, scoring rubrics, algorithms in `src/`

### 4.1 Docs that *are* the analysis write-up (carry these files even if code is rewritten)

| File | Why it matters |
|------|----------------|
| `METRICS_AUDIT.md` (711 lines) | Canonical formulas + known mismatches (fatigue-index divisor, EWMA, rest-day zeros, ACWR windows). This is the scoring rubric. |
| `DATA_FLOW.md` (889 lines) | End-to-end ACWR / strain / monotony / HRV / readiness / sleep / risk-zone journeys. |
| `ARCHITECTURE.md` (724 lines) | Full system map, gaps, four pillars. |
| `DATABASE_SCHEMA.md` / `HANDOFF.md` / `EDGE_FUNCTIONS.md` / `EDGE_FUNCTIONS_API.md` | Schema + function encyclopedia. Types lag SQL — prefer migrations + HANDOFF together. |
| `TEST_DATA_SETUP.md` | How synthetic wearable rows were built for demos. |
| `openapi.yaml` | API contract for many functions. |
| Many `OURA_*.md` | Expensive OAuth/webhook lessons — **NICE-TO-CARRY** as runbooks, not product. |

**No Jupyter notebooks.** Analysis lives in TypeScript + these markdown files + an external PDF.

### 4.2 Prompt / rubric IP in code

| Location | What |
|----------|------|
| `_shared/focus-mode-prompts.ts` | Mode-specific Yves instructions + metric weights. |
| `_shared/layered-reasoning.ts` | Must-pass layers + “why this / why now / why this intervention / why this user”. |
| `generate-daily-briefing`, `generate-yves-intelligence`, `yves-chat` | Full system prompts, coaching modes (rehab / performance / general_wellness), one-recommendation rules. |
| `src/lib/dynamicPrompts.ts` | Time-of-day + ACWR/HRV deviation copy. |
| `src/lib/yvesRecommendations.ts` | Client-side rec shaping. |
| `match-provider` `PARSE_TOOL` | SA sports-health triage schema (professional types enum, severity 1–10, red flags, ZAR). |
| `predict-provider` `PROVIDER_TYPES` | Specialty → urgency mapping. |
| `calculate-life-formulas` `scoreLF()` | Exact additive points from the PDF (e.g. sleep-poor → LF-04 +44, performance goal → LF-06 +38). |

### 4.3 Frontend algorithms (`src/lib`, `src/services`, hooks)

| File | Lines | Role |
|------|------:|------|
| `src/lib/riskDrivers.ts` | 1,551 | Same risk-driver engine as backend + daily-rotated exercise/why-text sets. **ANALYSIS / MUST-CARRY** |
| `src/lib/metricsCalculator.ts` | 112 | Unified ACWR/strain/HRV/sleep averages; Fitbit sleep-score formula. |
| `src/lib/alertConditions.ts` | 219 | ACWR>1.5, HRV<65, sleep<70, 12h spam window. |
| `src/services/treatmentPlanService.ts` | 256 | **Symptom → service map** + **ZAR fee bands** (physio 400–800, specialist 1000–2500, etc.). **ANALYSIS** |
| `src/services/practitionerService.ts` | 243 | DB `healthcare_practitioners` search (parallel to CSV Find Help). |
| `src/hooks/useTriagePrediction.ts` | — | Calls `predict-provider`. |
| `src/hooks/useMatchProvider.ts` / `useProviderMatch.ts` | — | Find Help. |
| `src/hooks/useTodaysDecision.ts` / `useRiskAlertTrigger.ts` / `useYvesIntelligence.ts` | — | Decision + risk + Yves. |
| `src/components/triage/TriageForm.tsx` | — | Triage UI. |
| `src/pages/FindHelp.tsx` | — | PapaParse CSV ranker (sport/symptom/urgency/location). |

~53 custom hooks. Pages covering dashboard, training, health, planner, find-help, Yves, documents, baselines, injury, admin, practitioner portal.

---

## 5. Predictiv Finder vs this repo (what already exists vs what only exists here)

**Finder repo:** `PeakMovement/predictiv-finder`  
**Live:** https://predictiv.co.za (Vite SPA on Lovable Cloud)  
**Not in GitHub:** `PeakMovement/Predictiv` — does not exist.  
**Out of scope (untouched):** Peak Movement marketing site.

### 5.1 What Finder already has (do not rebuild from MVP)

| Finder has | Notes |
|------------|--------|
| Public practitioner **directory** (`professionals` where `is_approved`) | Real Rondebosch/~5 km listings compiled from public websites (seed `20260916_rondebosch_directory_listings.sql`). Claim/join at `/join`. |
| Public directional assistant `/assistant` | Edge fn `analyze-health-concern` (Gemini, consent, PII strip, specialties: GP / physio / chiro / biokineticist). **Not Yves.** |
| `symptom-severity-evaluator` | Severity rules. |
| Blog CMS, sitemap, join/claim, busy/free availability view | Directory product. |
| Legacy **unrouted** plan generator (`src/utils/planGenerator/`, ~19k lines) + `treatments.csv` **Utility_Score** + synthetic `physicians.csv` (250 rows) | Finder itself marks this **LEGACY**. It is *Finder’s* old CSV product, not this MVP’s wearable OS. Carry/archive inside Finder; do not merge blindly into MVP. |
| 6 Finder edge functions, 16 migrations, 15 tables | Tiny compared with MVP. |

### 5.2 What ONLY exists in this repo (Old Predictiv)

Everything in sections 2–4 that is not a public directory:

- Wearable OAuth + sync + unified `wearable_sessions`  
- M2 Life Formulas + baseline_profiles + F-series metrics  
- ACWR / strain / monotony / EWMA / fatigue index / risk score  
- Yves (chat, briefing, recs, memory, layered reasoning, focus modes)  
- Deep 10-slice health profile + Genesis onboarding  
- Document intelligence  
- Logged-in Find Help + `predict-provider` triage against *wearable context*  
- Treatment/weekly plans driven by **load**, not only by symptom text  
- SMS/email risk alerts, cron science jobs, GDPR export/delete  
- Practitioner *portal* for viewing patient data (role-gated)  
- Google Calendar → planner (partial)  
- 87 functions, 138 migrations, 90+ tables  

Finder’s `analyze-health-concern` **overlaps conceptually** with `match-provider` / `predict-provider` (SA “who to see”), but:

- Finder: anonymous, 4 specialties, directory `professionals`.  
- MVP: authenticated, 7 professional types + emergency, wearable/baseline context, CSV + `physicians` table.

**Do not assume Finder triage replaces MVP triage IP.** Extract the tool schema + SA type enum + red-flag logic from `match-provider` and merge *into* Finder’s assistant if you want one triage brain.

### 5.3 Overlap that looks similar but is not the same data

| Topic | This repo | Finder |
|-------|-----------|--------|
| Practitioners | 28 **fake** CSV + US seed physicians | **Real** Rondebosch `professionals` + leftover synthetic CSV (legacy) |
| Plans | Load-based weekly plan + AI treatment plans | Legacy LP/utility `planGenerator` + `treatments.csv` (unrouted) |
| AI | Yves health coach | Directional specialty suggester |
| Auth product | Full health OS | Directory + optional professional portal |

---

## 6. Migration recommendation

### 6.1 MUST-CARRY (copy code + formulas + docs; then re-wire to Lovable Cloud)

1. **M2 Life Formula pack**  
   `calculate-life-formulas`, `onboarding_signals`, `user_life_formula`, Genesis UI (`OnboardingGoalsQ` + flow), and **locate the Scenario Selections PDF**.  
2. **M2 baseline / F-series pack**  
   `calculate-baselines`, `baseline_profiles` (+ F-06, F-10, F-12, F-14, F-19), `analyze-user-patterns`.  
3. **Training-load science pack**  
   `calculate-oura-trends`, `identify-risk-drivers`, `src/lib/riskDrivers.ts`, `METRICS_AUDIT.md`, `DATA_FLOW.md`. Formulas: ACWR, strain, monotony, EWMA λ=0.28, fatigue index, data_gap.  
4. **Deviation / anomaly / risk persistence**  
   `calculate-deviation`, `detect-health-anomalies`, `risk_score_history`, `alert_settings` wiring.  
5. **Yves pack**  
   `yves-chat`, `generate-yves-intelligence`, `generate-yves-recommendations`, `generate-daily-briefing`, `_shared/layered-reasoning.ts`, `_shared/focus-mode-prompts.ts`, `yves_memory_bank`.  
6. **Triage / matching algorithms** (not the fake CSV)  
   `match-provider` tool schema, `predict-provider` specialty map, `treatmentPlanService` symptom→service + ZAR bands. Point Finder’s assistant at this logic if you want one product.  
7. **Weekly / treatment plan engines**  
   `generate-weekly-plan`, `generate-treatment-plan`. Distinct from Finder’s legacy LP solver — keep both until someone compares quality.  
8. **Wearable integrations that actually work**  
   Oura (mature), Garmin (code complete; webhook infra risk), Polar (auth + fetch). Token tables + refresh.  
9. **Live Supabase dump** of this project before any freeze.  
10. **This file** plus `METRICS_AUDIT.md` / `DATA_FLOW.md` / `ARCHITECTURE.md` / `HANDOFF.md`.

### 6.2 NICE-TO-CARRY

- Document analysis + versioning  
- Challenges / reflections / engagement scoring  
- Google Calendar (finish Planner UI or drop)  
- Calendly webhook + booking emails  
- Practitioner dashboard / invite  
- SMS/email alert delivery (Twilio + Resend wiring)  
- Admin overview  
- Accessibility / PWA / offline queue (recent `main` work)  
- Oura troubleshooting docs (operational, not IP)  
- `export-user-data` / `delete-user-account` (legal, not science)

### 6.3 OBSOLETE — do not migrate as product data

| Item | Why |
|------|-----|
| `public/practitioners.csv` as a directory | Synthetic 555-numbers. Finder has real listings. |
| `seed-physicians` / `physicians` US rows | Fake US directory. |
| Fitbit tables + `calculate-baseline` Fitbit comments | Abandoned ingest. Keep formulas if still referenced; drop Fitbit OAuth. |
| `oura-auth-test`, `test-twilio-env` | Debug endpoints. |
| `stripe-webhook` | Scaffold. |
| InsightsTree placeholder UI | Function exists; page is fake data. |
| Duplicate baseline pipelines | Consolidate `calculate-baseline` vs `calculate-baselines` vs `user_baselines` vs `baseline_profiles`. |
| Peak Movement marketing | **Never touch** (per brief). |

### 6.4 Already superseded by Finder (for the *directory* product)

- Public “who to see” UX, Rondebosch listings, join/claim, blog, `analyze-health-concern` as the **public** assistant.  
- Finder’s **legacy** CSV physician ranker / planGenerator — already inside Finder, marked do-not-mount. Archive there; do not port from MVP.

### 6.5 Suggested sequence (matches Justin’s stated order)

1. **Finder → Lovable Cloud** (in flight). While doing that, **graft** MVP `match-provider` triage schema if the public assistant should get the richer SA type set (dietitian, S&C, run coach, emergency).  
2. **Export this Supabase** (schema + data + secrets inventory).  
3. **Port MUST-CARRY packs** as a second Lovable Cloud app (or a gated `/app` on the same project) — Yves + wearables + Life Formulas. Do not try to squash 87 functions into Finder’s 6.  
4. Reconnect OAuth apps (Oura/Garmin/Polar/Google) to the new URLs.  
5. Only then shelve `predictivmvp` **as a git archive**, not as a delete.

---

## 7. Risk: if we only migrate Finder and shelve this repo, Justin loses…

**If Finder is the only thing that goes to Lovable Cloud and this repo is frozen/deleted without a dump:**

1. **The entire wearable coaching product** — Oura/Garmin/Polar sync, dashboards, training load, sleep/HRV/readiness. Finder has none of this.  
2. **Paid sports-science IP:** ACWR, strain, monotony, EWMA, fatigue index, anomaly %, risk-driver ranking, F-series (HRV suppression, sleep debt, allostatic load, readiness composite, temperature deviation). Documented in `METRICS_AUDIT.md` and implemented twice (edge + `src/lib/riskDrivers.ts`).  
3. **Paid personalisation IP:** 10 Life Formulas + onboarding decision map encoded in `scoreLF()`. The source PDF is **not in git** — if the PDF is also lost, TypeScript is the only remaining spec.  
4. **Yves** — persona, layered reasoning, focus-mode prompts, daily briefing, memory bank, recommendation engine. Finder’s assistant is a different, thinner product.  
5. **Logged-in triage that uses health context** (`predict-provider`, `match-provider`, treatment-plan ZAR mapping). Finder only does anonymous specialty suggestion against a local directory.  
6. **Load-based weekly plans and AI treatment plans** (not Finder’s unrouted CSV optimizer).  
7. **Deep profile model** (injuries, nutrition, mindset, recovery, medical, training phase).  
8. **Document intelligence** (upload + AI extract).  
9. **Alerting stack** (SMS + email + escalation rules + risk history).  
10. **Production user history** sitting in this Supabase project (years of HRV/sleep/load if any paying users synced). That is not in Finder’s `zpddlphtoeluytrejioj` project.  
11. **OAuth app configurations and webhook URLs** tied to `predictiv.netlify.app` / this Supabase.  
12. **Operational knowledge** in 30+ markdown runbooks (especially Oura/Garmin pain). Replaceable but expensive.

**What he would *not* lose** (already in Finder): public Cape Town directory, real Rondebosch listings, join/claim, blog, public directional assistant, and Finder’s own legacy planGenerator/treatments.csv (if that git repo is kept).

**Bottom line:** Finder migration saves the **directory business**. It does **not** save the **R30k+ analysis/setup** in this repo. That value is the M2 formula engine, load-management science, Yves, and the wearable pipeline. Treat `predictivmvp` as a second product to migrate, with an explicit archive of git + Supabase + the missing PDF.

---

## Appendix A — Function checklist (87 names)

`adapt-user-model` · `admin-user-overview` · `analyze-all-user-engagement` · `analyze-document` · `analyze-user-engagement` · `analyze-user-patterns` · `backfill-memory-bank` · `build-health-profile` · `calculate-baseline` · `calculate-baselines` · `calculate-data-maturity` · `calculate-deviation` · `calculate-life-formulas` · `calculate-oura-trends` · `calculate-plan-adherence` · `calendly-webhook` · `complete-medical-session` · `create-booking` · `delete-user-account` · `detect-health-anomalies` · `email-preferences` · `evaluate-escalation-rules` · `export-user-data` · `fetch-garmin-auto` · `fetch-garmin-data` · `fetch-google-calendar-events` · `fetch-oura-auto` · `fetch-oura-data` · `fetch-polar-auto` · `fetch-polar-exercises` · `fetch-polar-sleep` · `garmin-auth` · `garmin-auth-initiate` · `garmin-webhook` · `generate-daily-briefing` · `generate-insights` · `generate-treatment-plan` · `generate-weekly-challenges` · `generate-weekly-plan` · `generate-yves-intelligence` · `generate-yves-recommendations` · `genesis-onboarding` · `get-activity-trends` · `get-bookings` · `get-daily-health-trends` · `get-medical-session` · `get-recovery-trends` · `get-weekly-health-trends` · `google-calendar-auth-callback` · `google-calendar-auth-initiate` · `google-calendar-create-event` · `health-check` · `identify-risk-drivers` · `interpret-health-event` · `lovable-ai-credits` · `manage-challenge-lifecycle` · `match-provider` · `notify-signup` · `oura-auth` · `oura-auth-initiate` · `oura-auth-test` · `oura-webhook` · `oura-webhook-setup` · `physician-match-advanced` · `polar-auth-callback` · `polar-auth-initiate` · `predict-provider` · `record-feedback` · `save-medical-session` · `seed-physicians` · `send-booking-confirmation` · `send-daily-summary-email` · `send-practitioner-invite` · `send-risk-email` · `send-sms-alert` · `stripe-webhook` · `symptom-analysis` · `sync-calendar-to-planner` · `system-health-check` · `test-twilio-env` · `track-engagement` · `trigger-risk-alert` · `wearable-diagnostics` · `wearables` · `yves-chat` · `yves-memory-update` · `yves-tree`

Plus `_shared/`: `ai-provider.ts`, `cache.ts`, `focus-mode-prompts.ts`, `layered-reasoning.ts`, `oura-token-refresh.ts`, `rate-limiter.ts`, `sanitization.ts`.

## Appendix B — Immediate actions (no code changes required)

1. **Do not delete** `PeakMovement/predictivmvp` or its Supabase project.  
2. **Find** the M2 / “Scenario Selections” / Onboarding Decision Map PDF (not in git).  
3. **Dump** this Supabase (schema + data) before any Lovable Cloud cutover of Old Predictiv.  
4. Keep Finder and this app as **two products** until the MUST-CARRY packs have a new home.  
5. Do not confuse `public/practitioners.csv` with paid directory research — that work landed in Finder’s `professionals` seed.

---

*Generated from a read-only audit of `PeakMovement/predictivmvp` `main` @ `3292b74` and a comparison clone of `PeakMovement/predictiv-finder` (2026-09-21). No Peak Movement marketing files were modified.*
