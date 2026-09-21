-- Add source column to training_trends to separate per-device rows.
-- Previously all devices shared onConflict: "user_id,date" — whichever
-- synced last overwrote the other's strain/monotony/acwr values.
-- Fix: unique constraint becomes (user_id, source, date) like wearable_sessions.

ALTER TABLE public.training_trends
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'oura';

-- Drop the old (user_id, date) unique constraint (may be named after the
-- original fitbit_trends table). We handle both possible names safely.
DO $$
DECLARE
  c TEXT;
BEGIN
  SELECT tc.constraint_name INTO c
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  WHERE tc.table_name = 'training_trends'
    AND tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND kcu.column_name IN ('user_id', 'date')
  GROUP BY tc.constraint_name
  HAVING COUNT(*) = 2
  LIMIT 1;

  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.training_trends DROP CONSTRAINT %I', c);
  END IF;
END $$;

ALTER TABLE public.training_trends
  ADD CONSTRAINT training_trends_user_source_date_key
  UNIQUE (user_id, source, date);

-- Update existing index to include source
DROP INDEX IF EXISTS idx_training_trends_user_date_metrics;
CREATE INDEX IF NOT EXISTS idx_training_trends_user_source_date
  ON public.training_trends (user_id, source, date DESC);
