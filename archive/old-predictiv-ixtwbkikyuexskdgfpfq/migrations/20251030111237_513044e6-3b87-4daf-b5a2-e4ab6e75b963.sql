-- Delete unused Fitbit cron jobs
DO $$ 
BEGIN
  -- Unschedule fetch-fitbit-auto-hourly if it exists
  PERFORM cron.unschedule('fetch-fitbit-auto-hourly');
EXCEPTION 
  WHEN OTHERS THEN NULL;
END $$;

DO $$ 
BEGIN
  -- Unschedule fitbit-diagnostics-nightly if it exists
  PERFORM cron.unschedule('fitbit-diagnostics-nightly');
EXCEPTION 
  WHEN OTHERS THEN NULL;
END $$;

-- Drop views first (if they exist)
DROP VIEW IF EXISTS public.fitbit_daily_summary CASCADE;
DROP VIEW IF EXISTS public.fitbit_dashboard CASCADE;

-- Drop unused Fitbit legacy tables (with CASCADE to remove dependencies)
DROP TABLE IF EXISTS public.fitbit_data CASCADE;
DROP TABLE IF EXISTS public.fitbit_sleep CASCADE;
DROP TABLE IF EXISTS public.fitbit_trends_backup CASCADE;
DROP TABLE IF EXISTS public.user_fitbit_data CASCADE;