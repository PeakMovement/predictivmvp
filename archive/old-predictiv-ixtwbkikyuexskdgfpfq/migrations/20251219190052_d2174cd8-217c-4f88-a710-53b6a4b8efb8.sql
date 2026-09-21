-- Update existing recovery_trends to have alert-triggering values
UPDATE public.recovery_trends
SET 
  acwr = 1.9,
  strain = 3600,
  monotony = 2.6
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884'::uuid
  AND period_date = CURRENT_DATE;

-- Insert low readiness data in wearable_sessions
INSERT INTO public.wearable_sessions (
  user_id,
  date,
  source,
  readiness_score,
  sleep_score,
  hrv_avg,
  resting_hr
) VALUES (
  '125ca6dd-715f-4c65-9d83-39ea06978884'::uuid,
  CURRENT_DATE,
  'test_mock',
  42,
  55,
  28,
  62
)
ON CONFLICT (user_id, date, source) DO UPDATE SET
  readiness_score = 42,
  sleep_score = 55;