/*
  # Add Onboarding Completion Tracking

  ## Overview
  This migration adds onboarding tracking functionality to enable a first-time
  user experience flow. Users can complete or skip onboarding, and resume later.

  ## Changes
  
  ### Create user_profiles table (if not exists)
  Stores user preferences and onboarding state
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `onboarding_completed` (boolean) - Whether onboarding is complete
  - `onboarding_skipped` (boolean) - Whether user skipped onboarding
  - `onboarding_step` (integer) - Last completed step (for resume)
  - `created_at` (timestamptz) - Record creation
  - `updated_at` (timestamptz) - Last update

  ## Security
  - Enable RLS on user_profiles table
  - Users can only view and update their own profile
  - Automatically create profile on user signup

  ## Notes
  - Onboarding can be resumed from last completed step
  - Users can skip and return to onboarding later via settings
*/

-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  onboarding_completed boolean DEFAULT false,
  onboarding_skipped boolean DEFAULT false,
  onboarding_step integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Add columns if table already exists but columns don't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_skipped'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_skipped boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'onboarding_step'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN onboarding_step integer DEFAULT 0;
  END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();
