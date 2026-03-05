/*
  # Add Timezone Support to Profiles

  1. Changes
    - Add `timezone` column to `profiles` table
    - Default to 'UTC' for existing users
    - Allow users to customize their timezone preference

  2. Purpose
    - Store user's preferred timezone for displaying dates/times
    - Handle daylight saving time automatically
    - Improve UX by showing times in user's local timezone
*/

-- Add timezone column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN profiles.timezone IS 'User preferred timezone in IANA format (e.g., America/New_York, Europe/London)';
