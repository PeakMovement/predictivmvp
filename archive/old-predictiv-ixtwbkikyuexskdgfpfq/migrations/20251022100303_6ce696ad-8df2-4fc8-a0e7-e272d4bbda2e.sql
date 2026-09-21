-- Remove existing cron job if it exists
SELECT cron.unschedule('fitbit-auto-sync-hourly');

-- Create new cron job for Fitbit auto-sync
-- Runs every hour at :05 past the hour
SELECT cron.schedule(
  'fitbit-auto-sync-hourly',
  '5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/fetch-fitbit-auto',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHdia2lreXVleHNrZGdmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjU4NDgsImV4cCI6MjA3MzMwMTg0OH0.c0w5R1_eKeNytHJgdxUJ2VPkQcnxE1KlyqXPCuJ77Fg"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);
