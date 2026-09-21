-- Remove alert-customization threshold columns from alert_settings.
-- Notification preference columns (briefing_enabled, briefing_time, etc.) are kept.

ALTER TABLE public.alert_settings
  DROP COLUMN IF EXISTS hrv_drop_threshold,
  DROP COLUMN IF EXISTS rhr_spike_threshold,
  DROP COLUMN IF EXISTS sleep_score_threshold,
  DROP COLUMN IF EXISTS readiness_score_threshold,
  DROP COLUMN IF EXISTS acwr_critical_threshold,
  DROP COLUMN IF EXISTS strain_critical_threshold,
  DROP COLUMN IF EXISTS monotony_critical_threshold,
  DROP COLUMN IF EXISTS severity_filter,
  DROP COLUMN IF EXISTS enable_popup_alerts,
  DROP COLUMN IF EXISTS enable_email_alerts,
  DROP COLUMN IF EXISTS enable_sms_alerts,
  DROP COLUMN IF EXISTS max_snooze_count,
  DROP COLUMN IF EXISTS training_context;
