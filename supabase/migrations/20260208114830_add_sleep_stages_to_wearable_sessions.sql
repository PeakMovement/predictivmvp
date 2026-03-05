/*
  # Add Sleep Stage Data to Wearable Sessions

  1. Changes
    - Add columns for sleep stage data to wearable_sessions table
    - Add columns: total_sleep_duration, deep_sleep_duration, rem_sleep_duration, light_sleep_duration, sleep_efficiency
    - All durations are stored in minutes for consistency

  2. Notes
    - These columns will be populated from Oura Ring sleep data
    - Duration values are in minutes
    - Efficiency is a percentage (0-100)
*/

DO $$
BEGIN
  -- Add total_sleep_duration column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_sessions' AND column_name = 'total_sleep_duration'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN total_sleep_duration numeric;
  END IF;

  -- Add deep_sleep_duration column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_sessions' AND column_name = 'deep_sleep_duration'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN deep_sleep_duration numeric;
  END IF;

  -- Add rem_sleep_duration column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_sessions' AND column_name = 'rem_sleep_duration'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN rem_sleep_duration numeric;
  END IF;

  -- Add light_sleep_duration column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_sessions' AND column_name = 'light_sleep_duration'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN light_sleep_duration numeric;
  END IF;

  -- Add sleep_efficiency column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_sessions' AND column_name = 'sleep_efficiency'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN sleep_efficiency numeric;
  END IF;
END $$;
