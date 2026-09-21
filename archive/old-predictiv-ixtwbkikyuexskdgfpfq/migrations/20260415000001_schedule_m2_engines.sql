-- Schedule the two M2 orchestration jobs that were missing:
--   1. calculate-baselines — runs daily, populates baseline_profiles
--      (M2 spec Section 6, line "Runs daily after wearable sync")
--   2. analyze-user-patterns — runs weekly, writes patterns to user_model
--      (M2 spec Sub-task 6, M2 checklist item 14)
--
-- Neither function has side effects beyond upserting their own tables, so
-- re-runs are safe and rollback is a one-line cron.unschedule().

-- ── 1. Daily baselines ──────────────────────────────────────────────
-- Scheduled 5 AM UTC so it runs after the auto-sync jobs
-- (oura hourly, garmin every 4h, polar every 4h +30min).

SELECT cron.unschedule('calculate-baselines-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'calculate-baselines-daily');

SELECT cron.schedule(
  'calculate-baselines-daily',
  '0 5 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/calculate-baselines',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- ── 2. Weekly pattern analysis ──────────────────────────────────────
-- Scheduled Sunday 4 AM UTC — low traffic window, after Saturday data has landed.

SELECT cron.unschedule('analyze-user-patterns-weekly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'analyze-user-patterns-weekly');

SELECT cron.schedule(
  'analyze-user-patterns-weekly',
  '0 4 * * 0',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/analyze-user-patterns',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
