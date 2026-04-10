-- Item 7: Schedule fetch-polar-auto to run every 4 hours via pg_cron.
-- Polar AccessLink has similar rate limits to Garmin, so 4-hourly is appropriate.
-- pg_cron and pg_net are already enabled in this project.

-- Remove any existing job first (idempotent)
SELECT cron.unschedule('polar-auto-sync')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'polar-auto-sync');

SELECT cron.schedule(
  'polar-auto-sync',
  '30 */4 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/fetch-polar-auto',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
