/*
  # Add distance tracking to wearable sessions

  1. Changes
    - Add `total_distance_km` column to store total daily distance in kilometers
    - Add `running_distance_km` column to store running-specific distance in kilometers
    
  2. Details
    - Both columns are nullable numeric fields to support gradual rollout
    - Existing data will have NULL values which is acceptable
    - New Garmin data fetches will populate these fields
    
  3. Notes
    - Distance stored in kilometers for consistency
    - Running distance is a subset of total distance
    - Supports both running-specific tracking and general activity distance
*/

-- Add distance columns to wearable_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_sessions' AND column_name = 'total_distance_km'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN total_distance_km numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_sessions' AND column_name = 'running_distance_km'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN running_distance_km numeric;
  END IF;
END $$;