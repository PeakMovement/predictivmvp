-- Add new Garmin-specific metric columns to wearable_sessions
-- These are populated by the fetch-garmin-data edge function

alter table public.wearable_sessions
  add column if not exists body_battery_start      smallint,
  add column if not exists body_battery_end        smallint,
  add column if not exists body_battery_min        smallint,
  add column if not exists body_battery_max        smallint,
  add column if not exists stress_avg              numeric(5,1),
  add column if not exists stress_max              numeric(5,1),
  add column if not exists vo2_max                 numeric(5,1),
  add column if not exists training_status         text,
  add column if not exists respiration_rate_avg    numeric(5,2),
  add column if not exists intensity_minutes_moderate  smallint,
  add column if not exists intensity_minutes_vigorous  smallint,
  add column if not exists session_type            text,
  add column if not exists avg_heart_rate          numeric(6,1),
  add column if not exists max_heart_rate          numeric(6,1),
  add column if not exists duration_minutes        integer,
  add column if not exists training_load           numeric(8,2);
