/*
  # Add active_calories Column to wearable_sessions

  1. New Column
    - `active_calories` (integer)
      - Stores calories burned from activities (excluding BMR)
      - Matches Oura API's active_calories field
      - Nullable to support existing records

  2. Purpose
    - Fix calories display on dashboard
    - Oura API returns active_calories, needs dedicated column
    - Keeps total_calories separate for future BMR + active calculations

  3. Safety
    - Non-destructive: existing data untouched
    - Does NOT modify readiness_score, sleep_score, or steps columns
    - Only adds new column for calories display
*/

-- Add active_calories column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'active_calories'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN active_calories integer;
  END IF;
END $$;
