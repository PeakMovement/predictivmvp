/*
  # Create Fitbit Integration Tables

  ## Overview
  This migration creates all necessary tables for Fitbit OAuth authentication and data sync.

  ## New Tables Created
  
  ### 1. fitbit_tokens
  - `user_id` (uuid, primary key) - Links to auth.users
  - `access_token` (text) - OAuth access token for Fitbit API
  - `refresh_token` (text) - OAuth refresh token
  - `token_type` (text) - Token type (usually "Bearer")
  - `expires_in` (integer) - Token expiry in seconds
  - `scope` (text) - Granted OAuth scopes
  - `fitbit_user_id` (text) - Fitbit user identifier
  - `created_at` (timestamptz) - Token creation timestamp
  - `updated_at` (timestamptz) - Last token refresh timestamp

  ### 2. fitbit_auto_data
  - `id` (serial, primary key) - Auto-increment ID
  - `user_id` (text) - User identifier
  - `activity` (jsonb) - Raw activity data from Fitbit
  - `sleep` (jsonb) - Raw sleep data from Fitbit
  - `fetched_at` (timestamptz) - Data fetch timestamp

  ### 3. fitbit_trends
  - `id` (uuid, primary key) - Unique trend record ID
  - `user_id` (text) - User identifier
  - `date` (text) - Date for the trend data
  - `training_load` (numeric) - Calculated training load
  - `acute_load` (numeric) - 7-day acute load
  - `chronic_load` (numeric) - 28-day chronic load
  - `acwr` (numeric) - Acute:Chronic Workload Ratio
  - `strain` (numeric) - Daily strain score
  - `hrv` (numeric) - Heart rate variability
  - `sleep_score` (numeric) - Sleep quality score
  - `monotony` (numeric) - Training monotony metric
  - `ewma` (numeric) - Exponentially weighted moving average
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Users can only access their own data
  - Service role has full access for automated processes
*/

-- Create fitbit_tokens table
CREATE TABLE IF NOT EXISTS public.fitbit_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_in INTEGER,
  scope TEXT,
  fitbit_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on fitbit_tokens
ALTER TABLE public.fitbit_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view their own Fitbit tokens"
  ON public.fitbit_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert their own Fitbit tokens"
  ON public.fitbit_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update their own Fitbit tokens"
  ON public.fitbit_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all tokens (for refresh operations)
CREATE POLICY "Service role can manage all Fitbit tokens"
  ON public.fitbit_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create fitbit_auto_data table
CREATE TABLE IF NOT EXISTS public.fitbit_auto_data (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  activity JSONB,
  sleep JSONB,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on fitbit_auto_data
ALTER TABLE public.fitbit_auto_data ENABLE ROW LEVEL SECURITY;

-- Users can view their own data
CREATE POLICY "Users can view their own Fitbit data"
  ON public.fitbit_auto_data
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Service role can manage all data
CREATE POLICY "Service role can manage all Fitbit data"
  ON public.fitbit_auto_data
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_fitbit_auto_data_user_id ON public.fitbit_auto_data(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_auto_data_fetched_at ON public.fitbit_auto_data(fetched_at DESC);

-- Create fitbit_trends table
CREATE TABLE IF NOT EXISTS public.fitbit_trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,
  training_load NUMERIC,
  acute_load NUMERIC,
  chronic_load NUMERIC,
  acwr NUMERIC,
  strain NUMERIC,
  hrv NUMERIC,
  sleep_score NUMERIC,
  monotony NUMERIC,
  ewma NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS on fitbit_trends
ALTER TABLE public.fitbit_trends ENABLE ROW LEVEL SECURITY;

-- Users can view their own trends
CREATE POLICY "Users can view their own Fitbit trends"
  ON public.fitbit_trends
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);

-- Service role can manage all trends
CREATE POLICY "Service role can manage all Fitbit trends"
  ON public.fitbit_trends
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fitbit_trends_user_id ON public.fitbit_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_fitbit_trends_date ON public.fitbit_trends(date DESC);
CREATE INDEX IF NOT EXISTS idx_fitbit_trends_user_date ON public.fitbit_trends(user_id, date);

-- Create function_execution_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.function_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'running')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  user_id UUID,
  metadata JSONB
);

-- Enable RLS on function_execution_log
ALTER TABLE public.function_execution_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage all logs
CREATE POLICY "Service role can manage function logs"
  ON public.function_execution_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view logs
CREATE POLICY "Users can view function logs"
  ON public.function_execution_log
  FOR SELECT
  TO authenticated
  USING (true);

-- Create notification_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'queued'))
);

-- Enable RLS on notification_log
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage all notifications
CREATE POLICY "Service role can manage notifications"
  ON public.notification_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view notifications (generic policy)
CREATE POLICY "Users can view notifications"
  ON public.notification_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);