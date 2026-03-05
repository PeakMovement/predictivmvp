/*
  # Google Calendar Integration Tables

  ## Overview
  This migration creates the necessary tables and security policies for Google Calendar integration,
  allowing users to connect their Google Calendar and sync events with the planner.

  ## New Tables
  
  ### `google_calendar_tokens`
  Stores OAuth2 tokens for authenticated users to access their Google Calendar
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `access_token` (text, encrypted) - OAuth access token
  - `refresh_token` (text, encrypted) - OAuth refresh token
  - `expires_at` (timestamptz) - Token expiration timestamp
  - `scope` (text) - Granted OAuth scopes
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `google_calendar_events`
  Stores synced calendar events from Google Calendar
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `google_event_id` (text, unique) - Google Calendar event ID
  - `calendar_id` (text) - Google Calendar ID
  - `summary` (text) - Event title/summary
  - `description` (text) - Event description
  - `start_time` (timestamptz) - Event start time
  - `end_time` (timestamptz) - Event end time
  - `location` (text) - Event location
  - `status` (text) - Event status (confirmed, tentative, cancelled)
  - `attendees` (jsonb) - Event attendees list
  - `raw_data` (jsonb) - Full Google Calendar event data
  - `synced_to_planner` (boolean) - Whether event is synced to planner
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `google_calendar_sync_logs`
  Tracks synchronization operations and their results
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `sync_type` (text) - Type of sync (full, incremental)
  - `status` (text) - Sync status (success, failed, partial)
  - `events_synced` (integer) - Number of events synced
  - `error_message` (text) - Error details if sync failed
  - `started_at` (timestamptz) - Sync start timestamp
  - `completed_at` (timestamptz) - Sync completion timestamp
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Users can only access their own calendar data
  - Authenticated users can read their own tokens
  - Service role can manage tokens for refresh operations
  - Users can view and manage their own events
  - Users can view their own sync logs

  ## Notes
  - Tokens are stored securely and should be encrypted at rest
  - Google Calendar API scopes required: calendar.readonly
  - Sync logs help with debugging and monitoring
  - Events can be selectively synced to the planner
*/

-- Create google_calendar_tokens table
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz NOT NULL,
  scope text NOT NULL DEFAULT 'https://www.googleapis.com/auth/calendar.readonly',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create google_calendar_events table
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id text NOT NULL,
  calendar_id text NOT NULL,
  summary text,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text,
  status text DEFAULT 'confirmed',
  attendees jsonb DEFAULT '[]'::jsonb,
  raw_data jsonb,
  synced_to_planner boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, google_event_id)
);

-- Create google_calendar_sync_logs table
CREATE TABLE IF NOT EXISTS google_calendar_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'full',
  status text NOT NULL DEFAULT 'pending',
  events_synced integer DEFAULT 0,
  error_message text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_calendar_tokens

CREATE POLICY "Users can view own calendar tokens"
  ON google_calendar_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar tokens"
  ON google_calendar_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar tokens"
  ON google_calendar_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar tokens"
  ON google_calendar_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role policy for token refresh
CREATE POLICY "Service role can manage all tokens"
  ON google_calendar_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for google_calendar_events

CREATE POLICY "Users can view own calendar events"
  ON google_calendar_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own calendar events"
  ON google_calendar_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own calendar events"
  ON google_calendar_events FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own calendar events"
  ON google_calendar_events FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for google_calendar_sync_logs

CREATE POLICY "Users can view own sync logs"
  ON google_calendar_sync_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync logs"
  ON google_calendar_sync_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_user_id ON google_calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_start_time ON google_calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_google_calendar_events_google_event_id ON google_calendar_events(google_event_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_logs_user_id ON google_calendar_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_google_calendar_sync_logs_created_at ON google_calendar_sync_logs(created_at DESC);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to update updated_at column
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_calendar_events_updated_at
  BEFORE UPDATE ON google_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
