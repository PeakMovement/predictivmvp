/*
  # User Pattern Insights Tracking

  1. New Tables
    - `user_shown_patterns`
      - Tracks which pattern insights have been shown to users and when
      - Enables rotation logic to prevent repetitive insights
      - Supports cooldown periods between showing the same pattern
  
  2. Columns
    - `id` (uuid, primary key) - Unique identifier
    - `user_id` (uuid) - Reference to auth.users
    - `pattern_id` (text) - Identifier for the pattern type (e.g., 'sleep-readiness')
    - `pattern_text` (text) - The actual text shown to the user
    - `shown_at` (timestamptz) - When this pattern was displayed
    - `category` (text) - Pattern category (training, recovery, sleep, stress, symptoms)
    - `tone` (text) - Pattern tone (coach, warm)
    
  3. Security
    - Enable RLS on `user_shown_patterns` table
    - Users can only view their own shown patterns
    - Users can insert their own pattern views
  
  4. Indexes
    - Index on (user_id, shown_at) for efficient recent pattern queries
    - Index on (user_id, pattern_id) for checking pattern cooldowns
*/

-- Create the user_shown_patterns table
CREATE TABLE IF NOT EXISTS user_shown_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_id text NOT NULL,
  pattern_text text NOT NULL,
  shown_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL CHECK (category IN ('training', 'recovery', 'sleep', 'stress', 'symptoms')),
  tone text NOT NULL CHECK (tone IN ('coach', 'warm')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_shown_patterns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own shown patterns"
  ON user_shown_patterns
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pattern views"
  ON user_shown_patterns
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_shown_patterns_user_shown 
  ON user_shown_patterns(user_id, shown_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_shown_patterns_user_pattern 
  ON user_shown_patterns(user_id, pattern_id);

-- Add a cleanup function to remove old pattern views (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_pattern_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_shown_patterns
  WHERE shown_at < now() - interval '30 days';
END;
$$;