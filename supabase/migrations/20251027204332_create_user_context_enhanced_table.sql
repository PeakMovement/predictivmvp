/*
  # Create user_context_enhanced Table
  
  1. New Tables
    - `user_context_enhanced`
      - `user_id` (uuid, primary key)
      - `nutrition_profile` (jsonb) - User's nutrition data
      - `medical_profile` (jsonb) - User's medical conditions and history
      - `training_profile` (jsonb) - User's training program and goals
      - `last_updated` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `user_context_enhanced` table
    - Add policies for authenticated users to view/update their own data
    - Add service role policy for full access
*/

CREATE TABLE IF NOT EXISTS user_context_enhanced (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nutrition_profile JSONB DEFAULT '{}',
  medical_profile JSONB DEFAULT '{}',
  training_profile JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_context_enhanced ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own context" ON user_context_enhanced;
CREATE POLICY "Users can view their own context"
ON user_context_enhanced FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own context" ON user_context_enhanced;
CREATE POLICY "Users can update their own context"
ON user_context_enhanced FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own context" ON user_context_enhanced;
CREATE POLICY "Users can insert their own context"
ON user_context_enhanced FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access to user_context" ON user_context_enhanced;
CREATE POLICY "Service role full access to user_context"
ON user_context_enhanced FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_context_enhanced_user_id ON user_context_enhanced(user_id);
