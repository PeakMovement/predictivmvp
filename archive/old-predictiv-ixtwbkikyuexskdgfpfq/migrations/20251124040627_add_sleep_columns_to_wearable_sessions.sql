/*
  # Add Sleep-Specific Columns to wearable_sessions
  
  Extends wearable_sessions to support sleep data from Polar and other devices.
  
  ## New Columns Added
  
  1. **start_time** (timestamptz)
     - The exact start time of a session (sleep or exercise)
     - Nullable to support existing date-based records
  
  2. **end_time** (timestamptz)
     - The exact end time of a session
     - Nullable to support existing date-based records
  
  3. **duration_seconds** (integer)
     - Total duration in seconds
     - Calculated from start_time to end_time for sleep
     - Already exists for exercises
  
  4. **sleep_continuity_score** (numeric)
     - Polar's continuity metric (1.0 to 5.0 scale)
     - Measures sleep fragmentation
  
  5. **sleep_stages** (jsonb)
     - Detailed breakdown of sleep stages
     - Format: { "light": seconds, "deep": seconds, "rem": seconds }
  
  6. **avg_hr_bpm** (integer)
     - Average heart rate during session
     - Used for both sleep and exercise
  
  7. **max_hr_bpm** (integer)
     - Maximum heart rate during session
     - Primarily for exercise, may be used for sleep analysis
  
  8. **distance_meters** (numeric)
     - Distance covered in meters (for exercises)
     - Nullable for sleep sessions
  
  9. **calories** (integer)
     - Total calories burned during session
     - Applicable to both sleep and exercise
  
  ## Important Notes
  
  - All columns are nullable to support existing records
  - Does NOT modify any Oura-specific columns
  - The unique constraint remains on (user_id, date, source)
  - We'll add a new unique constraint for time-based records: (user_id, start_time, source)
*/

-- Add start_time column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'start_time'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN start_time timestamptz;
    CREATE INDEX IF NOT EXISTS idx_wearable_sessions_start_time ON wearable_sessions(user_id, start_time DESC);
  END IF;
END $$;

-- Add end_time column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'end_time'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN end_time timestamptz;
  END IF;
END $$;

-- Add duration_seconds column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'duration_seconds'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN duration_seconds integer;
  END IF;
END $$;

-- Add sleep_continuity_score column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'sleep_continuity_score'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN sleep_continuity_score numeric;
  END IF;
END $$;

-- Add sleep_stages column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'sleep_stages'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN sleep_stages jsonb;
  END IF;
END $$;

-- Add avg_hr_bpm column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'avg_hr_bpm'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN avg_hr_bpm integer;
  END IF;
END $$;

-- Add max_hr_bpm column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'max_hr_bpm'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN max_hr_bpm integer;
  END IF;
END $$;

-- Add distance_meters column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'distance_meters'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN distance_meters numeric;
  END IF;
END $$;

-- Add calories column if it doesn't exist (different from calories_burned which is daily)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'calories'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN calories integer;
  END IF;
END $$;

-- Add updated_at column for tracking when records are modified
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;
