/*
  # Polar AccessLink Integration Tables
  
  Creates the necessary database infrastructure for Polar fitness device integration.
  This migration does NOT modify any existing Oura tables or data.
  
  ## New Tables Created
  
  1. **polar_tokens**
     - Stores OAuth access tokens for Polar API authentication
     - Long-lived tokens (no expiration/refresh needed)
     - Unique constraint on user_id (one Polar connection per user)
     - Includes polar_user_id from Polar's system
  
  2. **polar_logs**
     - Tracks all Polar data sync operations
     - Records success/failure status and entry counts
     - Helps debug sync issues and monitor API usage
  
  3. **polar_webhooks**
     - Stores webhook configuration (admin-only table)
     - Single webhook per application
     - Includes signature secret key for webhook verification
  
  ## Table Modifications
  
  1. **wearable_sessions**
     - Extends source check constraint to include 'polar'
     - Adds three optional Polar-specific columns
     - All changes are safe and nullable
     - Does NOT affect existing Oura or Fitbit data
  
  ## Security
  
  - RLS enabled on polar_tokens and polar_logs
  - Users can only access their own data
  - polar_webhooks has no RLS (admin-only operations)
  - Service role required for webhook management
*/

-- ============================================================================
-- TABLE 1: polar_tokens
-- ============================================================================
-- Stores OAuth access tokens for Polar API authentication
-- Polar tokens do not expire unless explicitly revoked by user

CREATE TABLE IF NOT EXISTS polar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  polar_user_id bigint,
  member_id text,
  access_token text NOT NULL,
  scope text DEFAULT 'accesslink.read_all',
  consent_error boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE polar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own tokens
CREATE POLICY "Users can read own polar tokens"
  ON polar_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own polar tokens"
  ON polar_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own polar tokens"
  ON polar_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own polar tokens"
  ON polar_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_polar_tokens_user_id ON polar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_polar_tokens_polar_user_id ON polar_tokens(polar_user_id);

-- ============================================================================
-- TABLE 2: polar_logs
-- ============================================================================
-- Tracks all Polar data synchronization operations

CREATE TABLE IF NOT EXISTS polar_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text NOT NULL CHECK (status IN ('success', 'error', 'partial')),
  data_type text CHECK (data_type IN ('exercise', 'sleep', 'activity', 'continuous_hr', 'all')),
  entries_synced integer DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE polar_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own logs
CREATE POLICY "Users can read own polar logs"
  ON polar_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own polar logs"
  ON polar_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_polar_logs_user_id ON polar_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_polar_logs_created_at ON polar_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polar_logs_status ON polar_logs(status);

-- ============================================================================
-- TABLE 3: polar_webhooks
-- ============================================================================
-- Stores webhook configuration (admin-only, no RLS)
-- Only one webhook per application is supported by Polar API

CREATE TABLE IF NOT EXISTS polar_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id text UNIQUE,
  signature_secret_key text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['EXERCISE', 'SLEEP', 'ACTIVITY_SUMMARY', 'CONTINUOUS_HEART_RATE'],
  url text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- No RLS on this table - admin operations only via service role
-- Create index for webhook_id lookups
CREATE INDEX IF NOT EXISTS idx_polar_webhooks_webhook_id ON polar_webhooks(webhook_id);

-- ============================================================================
-- EXTEND EXISTING TABLE: wearable_sessions
-- ============================================================================
-- Add Polar-specific columns and extend source constraint

-- Add new columns if they don't exist (all nullable, won't affect existing data)
DO $$ 
BEGIN
  -- Add training_load column for Polar's training load metric
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'training_load'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN training_load numeric;
  END IF;

  -- Add sport_type column for Polar's detailed sport classification
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'sport_type'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN sport_type text;
  END IF;

  -- Add device_model column to track which Polar device was used
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'device_model'
  ) THEN
    ALTER TABLE wearable_sessions ADD COLUMN device_model text;
  END IF;
END $$;

-- Update the source check constraint to include 'polar'
-- First, drop the old constraint if it exists
ALTER TABLE wearable_sessions DROP CONSTRAINT IF EXISTS wearable_sessions_source_check;

-- Create new constraint that includes 'polar'
ALTER TABLE wearable_sessions 
  ADD CONSTRAINT wearable_sessions_source_check 
  CHECK (source IN ('oura', 'fitbit', 'manual', 'polar'));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Confirm all tables and columns were created successfully

DO $$
BEGIN
  -- Verify polar_tokens table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'polar_tokens') THEN
    RAISE EXCEPTION 'polar_tokens table was not created';
  END IF;

  -- Verify polar_logs table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'polar_logs') THEN
    RAISE EXCEPTION 'polar_logs table was not created';
  END IF;

  -- Verify polar_webhooks table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'polar_webhooks') THEN
    RAISE EXCEPTION 'polar_webhooks table was not created';
  END IF;

  -- Verify new columns in wearable_sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'training_load'
  ) THEN
    RAISE EXCEPTION 'training_load column was not added to wearable_sessions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'sport_type'
  ) THEN
    RAISE EXCEPTION 'sport_type column was not added to wearable_sessions';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wearable_sessions' AND column_name = 'device_model'
  ) THEN
    RAISE EXCEPTION 'device_model column was not added to wearable_sessions';
  END IF;

  RAISE NOTICE 'Polar integration tables created successfully!';
END $$;
