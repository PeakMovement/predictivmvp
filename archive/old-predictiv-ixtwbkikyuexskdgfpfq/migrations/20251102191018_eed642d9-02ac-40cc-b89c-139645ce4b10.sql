-- Add category column to daily_briefings table
ALTER TABLE daily_briefings
ADD COLUMN category text DEFAULT 'full';

-- Add check constraint for valid categories
ALTER TABLE daily_briefings
ADD CONSTRAINT daily_briefings_category_check 
CHECK (category IN ('full', 'recovery', 'sleep', 'activity', 'goals', 'tip'));

-- Drop existing unique constraint if exists
ALTER TABLE daily_briefings
DROP CONSTRAINT IF EXISTS daily_briefings_user_id_date_key;

-- Add new unique constraint including category
ALTER TABLE daily_briefings
ADD CONSTRAINT daily_briefings_user_id_date_category_key 
UNIQUE (user_id, date, category);