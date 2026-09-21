-- Update default email_preferences to include dailySummary (daily briefing email)
-- Existing rows are unaffected — JSONB merging only applies to new inserts
ALTER TABLE public.users
  ALTER COLUMN email_preferences
  SET DEFAULT '{"dailySummary": true, "weeklySummary": true, "riskAlerts": true, "aiCoachRecommendations": true}'::jsonb;

-- Backfill: ensure existing rows that lack dailySummary get it set to true
UPDATE public.users
SET email_preferences = email_preferences || '{"dailySummary": true}'::jsonb
WHERE email_preferences IS NOT NULL
  AND (email_preferences->>'dailySummary') IS NULL;
