/*
  # Add Profile Fields for Settings Page

  ## Overview
  This migration adds profile fields needed for the Settings page profile update
  functionality, including name, email, and avatar storage.

  ## Changes
  
  ### Update user_profiles table
  Adds columns for storing user profile information:
  - `full_name` (text) - User's full name
  - `avatar_url` (text) - URL to user's avatar image
  - `phone_number` (text) - User's phone number for SMS alerts
  - `bio` (text) - User's biography or notes

  ## Security
  - Existing RLS policies cover these new columns
  - Users can only update their own profile data

  ## Notes
  - Email is managed by Supabase Auth, so we reference auth.users.email
  - Avatar URL can point to Supabase Storage or external URL
  - All fields are optional to support gradual profile completion
*/

-- Add profile fields to user_profiles if they don't exist
DO $$ 
BEGIN
  -- Add full_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'full_name'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN full_name text;
  END IF;

  -- Add avatar_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN avatar_url text;
  END IF;

  -- Add phone_number column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN phone_number text;
  END IF;

  -- Add bio column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN bio text;
  END IF;
END $$;

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
END $$;

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Anyone can view avatars (they're public)
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
