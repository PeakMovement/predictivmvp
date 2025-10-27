-- Phase 3: Migrate user_id from TEXT to UUID in fitbit_auto_data and fitbit_trends
-- Note: Foreign key constraints will be added in a separate step after data verification

-- Drop dependent views temporarily
DROP VIEW IF EXISTS fitbit_dashboard CASCADE;
DROP VIEW IF EXISTS fitbit_dashboard_view CASCADE;

-- PART 1: fitbit_auto_data migration
ALTER TABLE fitbit_auto_data ADD COLUMN user_id_uuid UUID;

-- Map TEXT user_ids to UUIDs (handle both direct UUIDs and fitbit_user_id mapping)
UPDATE fitbit_auto_data f
SET user_id_uuid = CASE
  -- If user_id is already a valid UUID, use it directly
  WHEN f.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN f.user_id::UUID
  -- Otherwise, map from users.fitbit_user_id to users.id
  ELSE (SELECT u.id FROM users u WHERE u.fitbit_user_id = f.user_id LIMIT 1)
END;

-- Delete orphaned records that couldn't be mapped to users
DELETE FROM fitbit_auto_data WHERE user_id_uuid IS NULL;

-- Drop old column and rename new one
ALTER TABLE fitbit_auto_data DROP COLUMN user_id;
ALTER TABLE fitbit_auto_data RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE fitbit_auto_data ALTER COLUMN user_id SET NOT NULL;

-- Add index (but not foreign key yet)
CREATE INDEX IF NOT EXISTS idx_fitbit_auto_data_user_id ON fitbit_auto_data(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_auto_data_date ON fitbit_auto_data(date);

-- PART 2: fitbit_trends migration
ALTER TABLE fitbit_trends ADD COLUMN user_id_uuid UUID;

-- Map TEXT user_ids to UUIDs (handle both direct UUIDs and fitbit_user_id mapping)
UPDATE fitbit_trends f
SET user_id_uuid = CASE
  -- If user_id is already a valid UUID, use it directly
  WHEN f.user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN f.user_id::UUID
  -- Otherwise, map from users.fitbit_user_id to users.id
  ELSE (SELECT u.id FROM users u WHERE u.fitbit_user_id = f.user_id LIMIT 1)
END;

-- Delete orphaned records that couldn't be mapped to users
DELETE FROM fitbit_trends WHERE user_id_uuid IS NULL;

-- Drop old column and rename new one
ALTER TABLE fitbit_trends DROP COLUMN user_id;
ALTER TABLE fitbit_trends RENAME COLUMN user_id_uuid TO user_id;
ALTER TABLE fitbit_trends ALTER COLUMN user_id SET NOT NULL;

-- Add index (but not foreign key yet)
CREATE INDEX IF NOT EXISTS idx_fitbit_trends_user_id ON fitbit_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_trends_date ON fitbit_trends(date);

-- Update unique constraint
ALTER TABLE fitbit_trends DROP CONSTRAINT IF EXISTS fitbit_trends_user_id_date_key;
ALTER TABLE fitbit_trends ADD CONSTRAINT fitbit_trends_user_id_date_key UNIQUE(user_id, date);

-- Recreate fitbit_dashboard view with correct column names
CREATE OR REPLACE VIEW fitbit_dashboard AS
SELECT 
    f.user_id,
    f.activity_data AS activity,
    f.sleep_data AS sleep,
    f.fetched_at
FROM fitbit_auto_data f;