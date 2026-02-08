/*
  # Create Challenges and Reflections Tables

  1. New Tables
    - `user_challenges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `challenge_title` (text) - Title of the challenge
      - `challenge_description` (text) - Description of the challenge
      - `challenge_type` (text) - Type: sleep, activity, recovery, etc.
      - `target_value` (numeric) - Target to achieve
      - `current_progress` (numeric) - Current progress towards goal
      - `accepted_at` (timestamptz) - When challenge was accepted
      - `completed_at` (timestamptz, nullable) - When challenge was completed
      - `week_start_date` (date) - Start of the week this challenge is for
      - `status` (text) - Status: active, completed, abandoned
      - `created_at` (timestamptz)
    
    - `weekly_reflections`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `week_start_date` (date) - Start of the week being reflected on
      - `week_end_date` (date) - End of the week
      - `rating` (integer) - 1-5 star rating
      - `notes` (text, nullable) - Optional reflection notes
      - `highlights` (text, nullable) - What went well
      - `challenges` (text, nullable) - What was difficult
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
    - Policies for select, insert, update
*/

-- Create user_challenges table
CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_title text NOT NULL,
  challenge_description text,
  challenge_type text NOT NULL,
  target_value numeric,
  current_progress numeric DEFAULT 0,
  accepted_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  week_start_date date NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  created_at timestamptz DEFAULT now()
);

-- Create weekly_reflections table
CREATE TABLE IF NOT EXISTS weekly_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  notes text,
  highlights text,
  challenges text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_challenges
CREATE POLICY "Users can view own challenges"
  ON user_challenges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own challenges"
  ON user_challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON user_challenges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON user_challenges FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for weekly_reflections
CREATE POLICY "Users can view own reflections"
  ON weekly_reflections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own reflections"
  ON weekly_reflections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections"
  ON weekly_reflections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_week ON user_challenges(week_start_date);
CREATE INDEX IF NOT EXISTS idx_user_challenges_status ON user_challenges(status);
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_user_id ON weekly_reflections(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_reflections_week ON weekly_reflections(week_start_date);
