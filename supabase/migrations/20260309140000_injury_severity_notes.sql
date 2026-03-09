-- Add severity (1-5) and notes columns to user_injury_profiles.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_injury_profiles' AND column_name = 'severity'
  ) THEN
    ALTER TABLE user_injury_profiles ADD COLUMN severity smallint CHECK (severity BETWEEN 1 AND 5);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_injury_profiles' AND column_name = 'notes'
  ) THEN
    ALTER TABLE user_injury_profiles ADD COLUMN notes text;
  END IF;
END $$;
