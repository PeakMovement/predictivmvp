-- Create cron job for Oura auto sync (runs every hour at minute 0)
SELECT cron.schedule(
  'oura-auto-sync',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/fetch-oura-auto',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHdia2lreXVleHNrZGdmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjU4NDgsImV4cCI6MjA3MzMwMTg0OH0.c0w5R1_eKeNytHJgdxUJ2VPkQcnxE1KlyqXPCuJ77Fg'
        ),
        body:=jsonb_build_object('user_id', '125ca6dd-715f-4c65-9d83-39ea06978884')
    ) as request_id;
  $$
);