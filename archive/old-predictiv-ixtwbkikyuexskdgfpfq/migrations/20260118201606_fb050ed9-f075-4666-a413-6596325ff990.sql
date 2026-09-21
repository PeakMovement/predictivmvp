-- Fix records with extreme strain and monotony values from corrupted calculations
UPDATE training_trends 
SET 
  strain = LEAST(strain, 2000),
  monotony = LEAST(monotony, 2.5)
WHERE strain > 2000 OR monotony > 2.5;

-- Also fix wearable_summary table
UPDATE wearable_summary 
SET 
  strain = LEAST(strain, 2000),
  monotony = LEAST(monotony, 2.5)
WHERE strain > 2000 OR monotony > 2.5;