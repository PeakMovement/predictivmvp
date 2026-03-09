-- Add notification preference columns to alert_settings so they live
-- alongside threshold settings (single-row-per-user settings table).
-- Also adds training_context for Yves AI personalization.

ALTER TABLE public.alert_settings
  ADD COLUMN IF NOT EXISTS briefing_enabled        boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS briefing_time           time        NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS alert_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_summary_enabled  boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS training_context        text;
