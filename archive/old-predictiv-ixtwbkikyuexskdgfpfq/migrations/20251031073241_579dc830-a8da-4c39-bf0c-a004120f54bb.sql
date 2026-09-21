-- Create unified wearable tables for multi-device support
-- This prepares the schema for Fitbit, Oura, and future wearable integrations

-- Table: wearable_sessions
-- Stores individual daily sessions from any wearable device
CREATE TABLE IF NOT EXISTS public.wearable_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL, -- 'fitbit', 'oura', etc.
  date date NOT NULL,
  sleep_score numeric,
  readiness_score numeric,
  activity_score numeric,
  total_steps integer,
  total_calories integer,
  resting_hr numeric,
  hrv_avg numeric,
  spo2_avg numeric,
  fetched_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, source, date)
);

-- Table: wearable_summary
-- Stores calculated training metrics and aggregated data
CREATE TABLE IF NOT EXISTS public.wearable_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  strain numeric,
  monotony numeric,
  acwr numeric,
  readiness_index numeric,
  source text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, source, date)
);

-- Enable Row Level Security
ALTER TABLE public.wearable_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wearable_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wearable_sessions
CREATE POLICY "Users can view their own wearable sessions"
  ON public.wearable_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wearable sessions"
  ON public.wearable_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wearable sessions"
  ON public.wearable_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to wearable_sessions"
  ON public.wearable_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for wearable_summary
CREATE POLICY "Users can view their own wearable summary"
  ON public.wearable_summary
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wearable summary"
  ON public.wearable_summary
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wearable summary"
  ON public.wearable_summary
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to wearable_summary"
  ON public.wearable_summary
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_user_date ON public.wearable_sessions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_sessions_source ON public.wearable_sessions(source);
CREATE INDEX IF NOT EXISTS idx_wearable_summary_user_date ON public.wearable_summary(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wearable_summary_source ON public.wearable_summary(source);

-- Add comments for documentation
COMMENT ON TABLE public.wearable_sessions IS 'Unified table for daily wearable device data from Fitbit, Oura, and future integrations';
COMMENT ON TABLE public.wearable_summary IS 'Aggregated training metrics and calculated indices across all wearable sources';

-- Archive note: Legacy tables preserved for historical data
-- - training_trends: Legacy Fitbit-specific trends (preserved for historical data)
-- - wearable_auto_data: Legacy raw Fitbit data storage (preserved for historical data)
-- These tables remain active but new integrations should use wearable_sessions/wearable_summary