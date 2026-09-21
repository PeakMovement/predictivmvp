/*
  # Add avg_sleep_score to wearable_summary table

  1. Changes
    - Add `avg_sleep_score` column to wearable_summary table
    - This field stores the 7-day rolling average of sleep scores
    - Used by fetch-oura-auto function for sleep quality trending

  2. Purpose
    - Enables tracking of sleep quality trends over time
    - Complements existing readiness_index for comprehensive recovery monitoring
    - Allows correlation analysis between sleep quality and training metrics
*/

-- Add avg_sleep_score column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wearable_summary' AND column_name = 'avg_sleep_score'
  ) THEN
    ALTER TABLE public.wearable_summary ADD COLUMN avg_sleep_score numeric;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN public.wearable_summary.avg_sleep_score IS '7-day rolling average of sleep scores for trend analysis';
