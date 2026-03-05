-- Populate EWMA, Strain, Monotony, and other training metrics for existing CTBNRR user
-- This fills in the NULL values in fitbit_trends with calculated/mock values for testing

-- Update existing records with calculated training metrics
UPDATE fitbit_trends 
SET 
  ewma = CASE 
    WHEN acwr IS NOT NULL THEN ((acwr - 1.0) * 5.0) -- EWMA derived from ACWR
    ELSE NULL 
  END,
  strain = CASE
    WHEN hrv IS NOT NULL THEN (75.0 - hrv + RANDOM() * 10) -- Strain inversely related to HRV
    ELSE NULL
  END,
  monotony = CASE
    WHEN acwr IS NOT NULL THEN (1.5 + RANDOM() * 0.8) -- Random monotony 1.5-2.3
    ELSE NULL
  END,
  training_load = CASE
    WHEN acwr IS NOT NULL THEN (400 + (acwr - 1.0) * 100 + RANDOM() * 50) -- Training load based on ACWR
    ELSE NULL
  END,
  acute_load = CASE
    WHEN acwr IS NOT NULL THEN (450 + RANDOM() * 100) -- Acute load
    ELSE NULL
  END,
  chronic_load = CASE
    WHEN acwr IS NOT NULL THEN (350 + RANDOM() * 80) -- Chronic load
    ELSE NULL
  END
WHERE user_id = 'CTBNRR' 
  AND (ewma IS NULL OR strain IS NULL OR monotony IS NULL);