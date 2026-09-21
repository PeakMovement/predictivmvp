-- Add temperature deviation columns to wearable_sessions
-- These are provided by Oura's readiness endpoint and feed F-12 (Temperature Deviation Alert)

ALTER TABLE public.wearable_sessions
  ADD COLUMN IF NOT EXISTS temperature_deviation numeric(5,2),
  ADD COLUMN IF NOT EXISTS temperature_trend_deviation numeric(5,2);
