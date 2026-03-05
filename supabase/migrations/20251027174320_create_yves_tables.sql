/*
  # Yves Intelligence MVP - Phase 0 Database Setup

  1. New Tables
    - `user_context`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `profile` (jsonb) - stores user profile data
      - `preferences` (jsonb) - stores user preferences like sleep goal, training focus
      - `injuries` (jsonb) - array of injury data
      - `updated_at` (timestamp)
    
    - `insight_history`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `query` (text) - user's question to Yves
      - `response` (text) - Yves' response
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to access only their own data
    
  Note: Using auth.users instead of custom users table since Supabase auth is already set up
*/

-- Create user_context table
CREATE TABLE IF NOT EXISTS user_context (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  injuries jsonb DEFAULT '[]',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create insight_history table
CREATE TABLE IF NOT EXISTS insight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  query text NOT NULL,
  response text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_insight_history_user_id ON insight_history(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_history_created_at ON insight_history(created_at DESC);

-- Enable RLS
ALTER TABLE user_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE insight_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_context
CREATE POLICY "Users can view own context"
  ON user_context
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own context"
  ON user_context
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own context"
  ON user_context
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for insight_history
CREATE POLICY "Users can view own insights"
  ON insight_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights"
  ON insight_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_user_context_updated_at ON user_context;
CREATE TRIGGER update_user_context_updated_at
  BEFORE UPDATE ON user_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
