/*
  # Focus Mode Preferences and Daily Briefing Enhancement

  ## Overview
  This migration enables Focus Mode to influence Daily Briefing content generation.
  Users can select a focus mode (Recovery, Performance, Pain Management, Balance, Custom)
  and Yves will orient briefings around that chosen priority.

  ## New Tables
  
  ### user_focus_preferences
  - `user_id` (uuid, primary key) - References auth.users
  - `focus_mode` (text) - Current selected focus mode
  - `custom_emphasis` (jsonb) - For custom mode, stores which topics to emphasize
  - `created_at` (timestamptz) - When preference was first set
  - `updated_at` (timestamptz) - When preference was last changed

  ## Modified Tables
  
  ### daily_briefings
  - Added `focus_mode` (text, nullable) - Tracks which focus mode was active when briefing generated
  - Added `focus_context` (jsonb, nullable) - Stores focus-specific context used in generation

  ## Security
  - RLS enabled on user_focus_preferences
  - Users can only read/write their own focus preferences
*/

-- Create user_focus_preferences table
CREATE TABLE IF NOT EXISTS user_focus_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  focus_mode text NOT NULL DEFAULT 'balance',
  custom_emphasis jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_focus_mode CHECK (
    focus_mode IN ('recovery', 'performance', 'pain_management', 'balance', 'custom')
  )
);

-- Enable RLS
ALTER TABLE user_focus_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_focus_preferences
CREATE POLICY "Users can read own focus preferences"
  ON user_focus_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus preferences"
  ON user_focus_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus preferences"
  ON user_focus_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add focus_mode column to daily_briefings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_briefings' AND column_name = 'focus_mode'
  ) THEN
    ALTER TABLE daily_briefings ADD COLUMN focus_mode text;
  END IF;
END $$;

-- Add focus_context column to daily_briefings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_briefings' AND column_name = 'focus_context'
  ) THEN
    ALTER TABLE daily_briefings ADD COLUMN focus_context jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index for faster focus mode lookups
CREATE INDEX IF NOT EXISTS idx_daily_briefings_focus_mode 
  ON daily_briefings(user_id, focus_mode, date);

-- Create updated_at trigger for user_focus_preferences
CREATE OR REPLACE FUNCTION update_focus_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_focus_preferences_updated_at ON user_focus_preferences;
CREATE TRIGGER set_focus_preferences_updated_at
  BEFORE UPDATE ON user_focus_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_focus_preferences_updated_at();
