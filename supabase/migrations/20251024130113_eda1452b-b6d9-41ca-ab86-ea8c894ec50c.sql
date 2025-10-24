-- Create scheduled trigger for fitbit-diagnostics (runs nightly at 23:55)
select cron.schedule(
  'fitbit-diagnostics-nightly',
  '55 23 * * *',
  $$
  select
    net.http_post(
        url:='https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/fitbit-diagnostics',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY_HERE"}'::jsonb,
        body:='{"user_id": "6a8b32ee-5c5d-42f5-ab3e-1bcb045d3649"}'::jsonb
    ) as request_id;
  $$
);