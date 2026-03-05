
-- First, delete duplicates keeping only the most recent row per (user_id, date, category, focus_mode)
DELETE FROM daily_briefings
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id, date, category, COALESCE(focus_mode, '__null__'))
    id
  FROM daily_briefings
  ORDER BY user_id, date, category, COALESCE(focus_mode, '__null__'), created_at DESC
);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_daily_briefings_unique_per_day 
ON daily_briefings (user_id, date, category, COALESCE(focus_mode, ''));
