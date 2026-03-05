-- Create hourly cron job for fetch-fitbit-auto
-- Note: pg_cron and pg_net extensions should already be enabled in Supabase
SELECT cron.schedule(
  'fetch-fitbit-auto-hourly',
  '0 * * * *', -- Run at the start of every hour
  $$
  SELECT
    net.http_post(
        url:='https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/fetch-fitbit-auto',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"}'::jsonb,
        body:='{"user_id": "6a8b32ee-5c5d-42f5-ab3e-1bcb045d3649"}'::jsonb
    ) as request_id;
  $$
);