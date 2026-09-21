# Old Predictiv — Value Inventory (pre-migration)

Generated before any disconnect. Source of truth: this repo (Lovable project
`496b78dd-5429-4d22-8cdf-157ebd1425c9`) wired to Supabase project
`ixtwbkikyuexskdgfpfq`.

Scope guard: **Predictiv Finder** (`zpddlphtoeluytrejioj`, Lovable project
`Medical Finder`) is a separate product and is only referenced here for overlap
analysis. The Peak Movement marketing site is out of scope entirely.

---

## 1. Headline numbers

| Asset | Count |
|---|---|
| Edge functions | **90** (incl. 7 shared libraries) |
| SQL migrations | **138** |
| Distinct tables created | **~130** |
| Database functions / triggers | 20+ (incl. `run_full_pipeline`, `has_role`, `handle_new_user_registration`) |
| Enums | `app_role`, `injury_type_enum`, `injury_phase_enum`, `practitioner_type_enum` |
| Seed datasets | `public/practitioners.csv` (28 SA practitioners), `seed-physicians` (30 US demo rows) |
| Docs in repo | 40+ markdown files (architecture, schema, edge function API, testing, integration runbooks) |

---

## 2. Paid-analysis IP — the R30k core

These encode modelling work, not boilerplate. **All must survive migration.**

### 2.1 Scoring, risk and trend engines
| Function | Size | What it encodes |
|---|---|---|
| `identify-risk-drivers` | 27 KB | Monotony, strain, ACWR caps; driver attribution model |
| `calculate-baselines` | 20 KB | Rolling personal baselines per metric |
| `calculate-oura-trends` | 18 KB | Oura load proxies, recovery trend maths |
| `calculate-deviation` | 9.4 KB | Deviation-from-baseline scoring |
| `calculate-life-formulas` | 12 KB | Life-formula engine (`user_life_formula`) |
| `calculate-data-maturity` | 8.4 KB | Maturity gates that unlock features |
| `detect-health-anomalies` | 8.2 KB | Physiological spike/drop thresholds per metric |
| `calculate-plan-adherence` | 5.7 KB | Adherence scoring |
| `adapt-user-model` | 7.7 KB | Behavioural learning loop → `user_model` |
| `analyze-user-patterns` | 12 KB | Pattern extraction across history |
| `_shared/layered-reasoning.ts` | 17 KB | **4-layer clinical validation engine** |

### 2.2 AI / Yves intelligence (prompt IP)
| Function | Size | Notes |
|---|---|---|
| `generate-daily-briefing` | 81 KB | Largest single asset. Briefing pipeline, silence logic, continuity/variety, caching + data-signature hashing |
| `generate-yves-intelligence` | 81 KB | Intelligence synthesis pipeline |
| `yves-chat` | 57 KB | Chat persona, tone rules, memory grounding |
| `generate-yves-recommendations` | 24 KB | Recommendation generation + ranking |
| `genesis-onboarding` | 19 KB | Onboarding signal capture → profile bootstrap |
| `interpret-health-event` | 12 KB | Health event interpreter v2 |
| `generate-weekly-plan` / `generate-weekly-challenges` | 10 KB each | Plan + challenge engines |
| `_shared/focus-mode-prompts.ts` | 7.3 KB | Focus-mode prompt library |
| `_shared/ai-provider.ts` | 8.9 KB | Gemini-primary / OpenAI-fallback failover chain |
| `yves-memory-update`, `backfill-memory-bank`, `yves-tree` | — | Memory bank + insight tree |

### 2.3 Clinical triage, matching and treatment
| Function | Size | Notes |
|---|---|---|
| `predict-provider` | 17 KB | Triage scoring → clinical pathway mapping |
| `match-provider` | 10 KB | AI intent parse + provider scoring (budget/location/urgency weights) |
| `physician-match-advanced` | 8.7 KB | Advanced matching |
| `generate-treatment-plan` | 5.6 KB | AI treatment plan generation |
| `symptom-analysis` | 5.9 KB | Severity 1–10 + emergency red-flag detection |
| `evaluate-escalation-rules` | 9.6 KB | Parameter-driven escalation rules table |
| `trigger-risk-alert` / `send-risk-email` / `send-sms-alert` | — | Alert validation + Twilio/Resend dispatch |

### 2.4 Wearable ingestion pipelines
Oura (`fetch-oura-data`, `fetch-oura-auto`, `oura-auth*`, `oura-webhook*`,
`_shared/oura-token-refresh.ts` 17 KB), Garmin (`fetch-garmin-data` 35 KB,
`garmin-auth*`, `garmin-webhook` 21 KB), Polar (4 functions), Fitbit (tables only).
Idempotent upserts on `(user_id, date)`; token encryption at rest; rate limiting
and retry queue (`_shared/rate-limiter.ts`, `sync_retry_queue`, `rate_limit_state`).

### 2.5 Supporting infrastructure
`_shared/sanitization.ts`, `_shared/cache.ts`, `system-health-check`,
`wearable-diagnostics`, `sync_health_log`, `function_execution_log`,
`admin-user-overview`, RBAC via `user_roles` + `has_role()` security-definer.

---

## 3. Table groups

- **Identity/roles**: `user_profiles`, `user_roles`, `profiles`, `practitioner_access`
- **Onboarding/context**: `user_context`, `user_context_enhanced`, `onboarding_signals`, `user_injuries`, `user_interests`, `user_lifestyle`, `user_medical`, `user_mindset`, `user_nutrition`, `user_recovery`, `user_training`, `user_wellness_goals`, `user_injury_profiles`
- **Wearables**: `wearable_sessions`, `wearable_summary`, `wearable_tokens`, `oura_*` (13 tables), `polar_*` (3), `fitbit_*` (3), `garmin_oauth_state`
- **Analytics/trends**: `health_trends_daily`, `health_trends_weekly`, `activity_trends`, `recovery_trends`, `baseline_profiles`, `health_anomalies`, `risk_score_history`, `risk_trajectories`, `user_life_formula`, `user_data_maturity`, `prediction_log`
- **Yves/AI**: `daily_briefings`, `insight_history`, `yves_memory_bank`, `yves_recommendations`, `prompt_history`, `recommendation_outcomes`, `user_model`, `user_adaptation_profile`, `user_shown_patterns`, `engagement_events`
- **Clinical**: `symptom_check_ins`, `triage_results`, `escalation_rules`, `escalation_log`, `alert_settings`, `alert_history`, `risk_alert_dismissals`, `medical_finder_sessions`
- **Providers/bookings**: `physicians`, `practitioners`, `practitioner_bookings`, `healthcare_practitioners`, `practitioner_specialties`, `service_categories`, `provider_reviews`, `review_helpful_votes`, `treatment_plans`, `treatment_plan_services`, `treatment_plan_feedback`, `user_treatment_preferences`
- **Docs**: `user_documents`, `document_versions`, `document_insights`, `document_processing_log`
- **Planner/challenges**: `accountability_challenges`, `user_challenges`, `weekly_reflections`, `plan_adherence`, `user_focus_preferences`, `google_calendar_*` (3)
- **Ops**: `sync_health_log`, `sync_retry_queue`, `rate_limits`, `rate_limit_state`, `function_execution_log`, `notification_log`, `csv_uploads`

---

## 4. UNIQUE to Old Predictiv vs Predictiv Finder

Predictiv Finder has **6 edge functions** (`ai-health-assistant`,
`analyze-health-concern`, `symptom-severity-evaluator`, `create-practitioner`,
`sync-calendar-availability`, `blog-sitemap`) and ~20 tables (`professionals`,
`bookings`, `availability_slots`, `health_plans`, `symptom_*`, `blog_posts`,
`popia_consents`, `profiles`, `search_history`).

**Overlap (Finder already has an equivalent):** practitioner directory,
booking/availability, basic symptom severity, AI health plan generation.

**UNIQUE to Old Predictiv — no equivalent in Finder, must migrate:**
1. The entire **wearable layer** (Oura / Garmin / Polar / Fitbit OAuth, webhooks, token refresh, idempotent sync, diagnostics).
2. The entire **Yves AI system** — briefings, intelligence, chat, memory bank, insight tree, recommendations, focus modes, provider failover.
3. **Risk & trend engines** — risk drivers, baselines, deviation, anomalies, monotony/ACWR, fatigue index, life formulas, data maturity.
4. **Behavioural learning loop** — engagement events, user model, adaptation profile, prediction log, recommendation outcomes.
5. **Escalation & alerting** — rules table, escalation log, SMS/email risk alerts, dismissal logic.
6. **Clinical triage engine** (`predict-provider` + `layered-reasoning.ts`) — materially deeper than Finder's severity evaluator.
7. **Planner / challenges / Google Calendar** sync.
8. **Document intelligence** — upload, versioning, AI analysis, insights.
9. **Ops/observability** — sync health log, retry queue, rate limiting, admin overview, RBAC.
10. **SA practitioner dataset** (`public/practitioners.csv`).

---

## 5. Obsolete — recommend dropping, with evidence

| Asset | Evidence |
|---|---|
| `seed-physicians` | 30 hardcoded **US** demo doctors ("Dr. Emily Carter, New York, Blue Cross"). Not SA, not real. Superseded by `practitioners` + `public/practitioners.csv`. |
| `oura-auth-test`, `test-twilio-env` | Env-probe debug endpoints, no product logic. |
| `fitbit_*` tables | Tables exist, **no Fitbit edge functions**. Also excluded by the Oura+Garmin focus decision. |
| `polar-*` (4 functions, 3 tables) | Built, but product scope says Oura + Garmin only. Migrate as dormant code, do not surface UI. |
| `20251006020856_remote_stub.sql` and the 3 duplicate `oura` rebuild migrations | Replay artefacts; superseded by the final rebuild. Consolidate, don't replay. |

Nothing above is deleted by this migration — it is carried into the archive branch regardless.

---

## 6. What CANNOT be carried automatically

1. **Row data** in `ixtwbkikyuexskdgfpfq`. Needs a `pg_dump` run with that project's database password — not available to this environment.
2. **Auth users** (`auth.users` + password hashes). Requires the same dump, or users re-register.
3. **Secret values** (Oura/Garmin/Polar/Google/Stripe/Twilio/Resend/OpenAI keys). Supabase never reveals stored secrets; each must be re-entered into Cloud.
4. **OAuth provider redirect URIs**. Every provider portal (Oura, Garmin, Polar, Google, Calendly, Stripe) must be updated to the new Cloud callback URLs.
5. **Cron/scheduled jobs** on the old project (`pg_cron` entries for auto-sync, briefing generation) must be re-created.
