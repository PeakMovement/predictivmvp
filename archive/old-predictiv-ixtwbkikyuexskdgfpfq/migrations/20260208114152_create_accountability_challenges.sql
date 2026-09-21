/*
  # Create Accountability Challenges System

  1. New Tables
    - `accountability_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text)
      - `description` (text)
      - `challenge_type` (text) - workout_streak, distance_goal, frequency_goal, etc.
      - `target_value` (numeric) - target metric value
      - `current_value` (numeric) - current progress
      - `unit` (text) - km, sessions, days, etc.
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text) - pending, active, completed, failed, declined
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `accountability_challenges` table
    - Add policies for authenticated users to manage their own challenges
*/

CREATE TABLE IF NOT EXISTS accountability_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  challenge_type text NOT NULL DEFAULT 'custom',
  target_value numeric NOT NULL DEFAULT 0,
  current_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'sessions',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE accountability_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view own challenges"
  ON accountability_challenges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenges"
  ON accountability_challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON accountability_challenges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON accountability_challenges FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_accountability_challenges_user_id ON accountability_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_accountability_challenges_status ON accountability_challenges(status);
CREATE INDEX IF NOT EXISTS idx_accountability_challenges_end_date ON accountability_challenges(end_date);
