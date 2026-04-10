-- F-12: Temperature Deviation Alert columns
-- Oura Gen 3+ only. temperature_deviation is already relative to personal
-- baseline (computed by Oura), so we store the raw value + a severity status.

ALTER TABLE public.baseline_profiles
  ADD COLUMN IF NOT EXISTS f12_temp_deviation_value  NUMERIC,   -- latest temp deviation (°C from personal baseline)
  ADD COLUMN IF NOT EXISTS f12_temp_deviation_status TEXT       -- 'normal' | 'elevated' | 'alert' | 'unavailable'
    CHECK (f12_temp_deviation_status IN ('normal', 'elevated', 'alert', 'unavailable'));
