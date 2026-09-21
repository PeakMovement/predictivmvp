# Migrate Old Predictiv onto Lovable Cloud

## What I found first (inventory done, nothing disconnected)

I catalogued the whole product before proposing anything. The full write-up is
saved as `MIGRATION_VALUE_INVENTORY.md` in the project.

Headline: **90 backend functions, 138 database migrations, ~130 tables, 40+ docs.**

The paid analysis is concentrated in roughly 25 of those functions:
- Risk and trend maths (risk drivers, baselines, deviation, anomalies, life formulas, data maturity)
- The whole Yves AI system (daily briefing, intelligence, chat, memory, recommendations) — the briefing engine alone is 81 KB of logic and prompts
- Clinical triage and provider matching, plus the 4-layer clinical reasoning library
- Wearable ingestion for Oura, Garmin and Polar, including token refresh, webhooks and retry/rate-limit handling
- The behavioural learning loop that adapts to each user

## Old Predictiv vs Predictiv Finder

Finder has only 6 functions and covers a practitioner directory, bookings,
simple symptom severity and AI health plans. Everything else in Old Predictiv is
unique: wearables, Yves, risk engines, learning loop, escalation/alerting,
planner and challenges, document intelligence, and the ops layer.

So **merging into Finder is not the safe path** — Finder would have to absorb
~85 unique functions. My recommendation is to keep Old Predictiv as its own
product and move it onto its own Cloud backend, exactly as you asked.

## Things I found that look obsolete (evidence in the inventory, nothing deleted)

- `seed-physicians` — 30 hardcoded **US** demo doctors, superseded by the real SA practitioner list
- `oura-auth-test`, `test-twilio-env` — debug probes
- Fitbit tables with no matching backend code
- Polar is built but outside the agreed Oura + Garmin scope — carried over dormant

## The plan

**Step 1 — Archive first.** Commit the inventory plus a full copy of every
function, migration, prompt and dataset to an archive path in this repo, so the
IP is safe on disk regardless of what happens to the old Supabase project.

**Step 2 — Turn on Lovable Cloud.** This creates a brand-new backend for this
project. The old one stays untouched and connected until the new one is proven.

**Step 3 — Rebuild the database.** The 138 migrations contain replay artefacts
and duplicate rebuilds, so replaying them blindly will fail. I'll build one
clean consolidated schema covering all ~130 tables, their access rules, roles,
triggers and helper functions, and apply that to Cloud.

**Step 4 — Redeploy the backend logic.** All 90 functions move across with their
scoring models and prompts intact. Dead debug endpoints are dropped and noted.

**Step 5 — Reconnect the outside world.** Re-enter every API key and update the
callback addresses at Oura, Garmin, Polar, Google, Calendly and Stripe.

**Step 6 — Move your data.** This is the one step I cannot do alone (see below).

**Step 7 — Verify, then cut over.** Sign in, run a wearable sync, generate a
briefing, run a risk calculation and a provider match end to end. Only once
those pass do we switch the app over and, if you want it reachable, publish it.

**Step 8 — Deliver the "what we preserved from the R30k build" summary.**

## What I need from you

1. **The database password** for the old project (`ixtwbkikyuexskdgfpfq`) —
   found in its Supabase dashboard under Settings → Database. Without it I
   cannot export your existing rows or user accounts. I'll ask for it through
   the secure form, never in chat.
2. **The API keys** again for Oura, Garmin, Polar, Google, Stripe, Twilio and
   Resend. Supabase never reveals stored keys, so they have to be re-entered.
3. A decision on **existing user accounts**: carry them across with their
   passwords (needs the export above), or have people re-register.

If the password isn't available, I can still do everything except the data move
— you'd get a fully working Cloud backend with an empty database, and we can
import the data later.

## Technical detail

- Consolidated baseline migration replaces the 138-file history; the originals
  are preserved under the archive path for provenance.
- `public.*` tables each get explicit `GRANT`s plus RLS scoped to
  `auth.uid() = user_id`; roles stay in the separate `user_roles` table behind
  the `has_role()` security-definer function.
- `_shared/` libraries (`layered-reasoning`, `ai-provider`, `oura-token-refresh`,
  `focus-mode-prompts`, `rate-limiter`, `sanitization`, `cache`) move verbatim.
- `src/integrations/supabase/client.ts` and `src/lib/supabaseConfig.ts` currently
  hardcode the old project URL; they get repointed to Cloud env vars at cutover.
- `pg_cron` schedules for auto-sync and briefing generation are re-created on Cloud.
- The old Supabase link is left in place until verification passes.
