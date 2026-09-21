-- Add sleep_score column to fitbit_trends
ALTER TABLE fitbit_trends ADD COLUMN IF NOT EXISTS sleep_score NUMERIC;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_fitbit_trends_user_date ON fitbit_trends(user_id, date DESC);

-- Enable realtime for fitbit_trends
ALTER TABLE fitbit_trends REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE fitbit_trends;