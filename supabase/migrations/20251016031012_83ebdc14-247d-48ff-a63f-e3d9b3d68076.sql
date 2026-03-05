-- Create fitbit_trends table for storing calculated training metrics
CREATE TABLE fitbit_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  acwr FLOAT,
  ewma FLOAT,
  strain FLOAT,
  monotony FLOAT,
  hrv FLOAT,
  training_load FLOAT,
  acute_load FLOAT,
  chronic_load FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create index for efficient queries
CREATE INDEX idx_fitbit_trends_user_date ON fitbit_trends(user_id, date DESC);

-- Enable RLS
ALTER TABLE fitbit_trends ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for frontend)
CREATE POLICY "Allow public read access to fitbit_trends"
ON fitbit_trends
FOR SELECT
USING (true);

-- Allow insert/update from service role (backend functions)
CREATE POLICY "Allow service role to insert/update fitbit_trends"
ON fitbit_trends
FOR ALL
USING (true)
WITH CHECK (true);