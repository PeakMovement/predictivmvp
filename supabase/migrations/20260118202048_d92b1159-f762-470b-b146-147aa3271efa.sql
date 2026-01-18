-- Fix extreme strain and monotony values in recovery_trends table
UPDATE recovery_trends 
SET 
  strain = LEAST(strain, 2000),
  monotony = LEAST(monotony, 2.5)
WHERE strain > 2000 OR monotony > 2.5;