-- Normalize all null focus_mode values to empty string
UPDATE daily_briefings SET focus_mode = '' WHERE focus_mode IS NULL;

-- Set column default to empty string
ALTER TABLE daily_briefings ALTER COLUMN focus_mode SET DEFAULT '';
ALTER TABLE daily_briefings ALTER COLUMN focus_mode SET NOT NULL;

-- Drop the expression-based index that upsert can't match
DROP INDEX IF EXISTS idx_daily_briefings_unique_per_day;

-- Create a simple column-based unique constraint that ON CONFLICT can reference
ALTER TABLE daily_briefings ADD CONSTRAINT uq_daily_briefings_per_day UNIQUE (user_id, date, category, focus_mode);