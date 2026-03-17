-- Drop all Fitbit-related tables and objects
-- Fitbit integration was never completed and is being removed

-- Drop fitbit_tokens table and all its policies
DROP TABLE IF EXISTS public.fitbit_tokens CASCADE;

-- Drop fitbit_auto_data table and all its policies
DROP TABLE IF EXISTS public.fitbit_auto_data CASCADE;

-- Drop fitbit_trends table and all its policies
DROP TABLE IF EXISTS public.fitbit_trends CASCADE;

-- Drop the helper function that referenced fitbit_auto_data
DROP FUNCTION IF EXISTS strip_tokens_from_activity(uuid);

-- Remove fitbit_user_id column from wearable_tokens if it exists
ALTER TABLE public.wearable_tokens DROP COLUMN IF EXISTS fitbit_user_id;

-- Update wearable_sessions source check constraint to remove 'fitbit'
ALTER TABLE public.wearable_sessions DROP CONSTRAINT IF EXISTS wearable_sessions_source_check;
ALTER TABLE public.wearable_sessions
  ADD CONSTRAINT wearable_sessions_source_check
  CHECK (source IN ('oura', 'manual', 'polar', 'garmin'));
