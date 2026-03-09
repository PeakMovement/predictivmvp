-- Add extended profile fields to user_profiles for the Profile page build-out.
-- All columns are optional (nullable) to support gradual completion.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'sport') THEN
    ALTER TABLE user_profiles ADD COLUMN sport text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'position') THEN
    ALTER TABLE user_profiles ADD COLUMN position text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'date_of_birth') THEN
    ALTER TABLE user_profiles ADD COLUMN date_of_birth date;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'experience_level') THEN
    ALTER TABLE user_profiles ADD COLUMN experience_level text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'weekly_training_hours') THEN
    ALTER TABLE user_profiles ADD COLUMN weekly_training_hours numeric;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'primary_goal') THEN
    ALTER TABLE user_profiles ADD COLUMN primary_goal text;
  END IF;
END $$;
