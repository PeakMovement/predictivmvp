/*
  # Add event_type and details columns to polar_logs

  The Polar edge functions (polar-auth-callback, fetch-polar-exercises,
  fetch-polar-sleep, fetch-polar-auto) insert `event_type` and `details`
  into `polar_logs`, but the original table only had
  `status`, `data_type`, `entries_synced`, `error_message`.

  Every log insert was silently failing with "column does not exist",
  leaving polar_logs empty and masking sync errors.

  This migration adds the two missing columns non-destructively.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polar_logs' AND column_name = 'event_type'
  ) THEN
    ALTER TABLE polar_logs ADD COLUMN event_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polar_logs' AND column_name = 'details'
  ) THEN
    ALTER TABLE polar_logs ADD COLUMN details jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_polar_logs_event_type ON polar_logs(event_type);
