/*
  # Create user_health_profiles Table
  
  1. New Tables
    - `user_health_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `profile_data` (jsonb) - Comprehensive health data
      - `ai_synthesis` (text) - AI-generated health profile summary
      - `generated_at` (timestamptz) - Profile generation timestamp
      - `version` (integer) - Profile version number
  
  2. Security
    - Enable RLS on `user_health_profiles` table
    - Add policy for authenticated users to view their own profiles
    - Add service role policy for full access
  
  3. Indexes
    - Index on user_id for fast lookups
    - Index on generated_at for sorting by recency
*/

CREATE TABLE IF NOT EXISTS user_health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_synthesis TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_user_health_profiles_user ON user_health_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_health_profiles_generated ON user_health_profiles(generated_at DESC);

ALTER TABLE user_health_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own health profiles" ON user_health_profiles;
CREATE POLICY "Users can view their own health profiles"
ON user_health_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to health profiles" ON user_health_profiles;
CREATE POLICY "Service role full access to health profiles"
ON user_health_profiles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
