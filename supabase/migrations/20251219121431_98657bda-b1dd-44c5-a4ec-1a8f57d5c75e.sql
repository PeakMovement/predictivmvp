-- Insert test recovery trends data with critical ACWR to trigger alert
INSERT INTO public.recovery_trends (user_id, period_date, acwr, strain, recovery_score, acute_load, chronic_load)
VALUES (
  '8903f322-bfd0-4174-a2c9-04508bacd73a',
  CURRENT_DATE,
  1.95,  -- Critical ACWR threshold is 1.8
  3600,  -- Critical strain threshold is 3500
  45,
  850,
  435
)
ON CONFLICT (user_id, period_date) DO UPDATE SET
  acwr = 1.95,
  strain = 3600,
  recovery_score = 45;