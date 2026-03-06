-- Schedule fetch-garmin-auto to run every 4 hours via pg_cron.
-- Garmin's rate limits are more conservative than Oura's, so 4-hourly is appropriate.
-- pg_cron and pg_net are already enabled in this project.

-- Remove any existing job first (idempotent)
SELECT cron.unschedule('garmin-auto-sync')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'garmin-auto-sync');

SELECT cron.schedule(
  'garmin-auto-sync',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/fetch-garmin-auto',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
