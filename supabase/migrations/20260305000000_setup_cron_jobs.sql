-- Enable pg_cron and pg_net extensions if not already enabled
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Detect health anomalies daily at 7:00 AM UTC (after overnight wearable sync)
select cron.schedule(
  'detect-health-anomalies-daily',
  '0 7 * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/detect-health-anomalies',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Adapt user models weekly on Sunday at 3:00 AM UTC (low traffic window)
select cron.schedule(
  'adapt-user-model-weekly',
  '0 3 * * 0',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_URL') || '/functions/v1/adapt-user-model',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'SUPABASE_SERVICE_ROLE_KEY')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
