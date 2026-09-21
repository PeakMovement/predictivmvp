-- Consolidate profile writes onto user_profiles (canonical).
-- Frontend writes ONLY to user_profiles. Database triggers mirror data to
-- the legacy tables (user_profile, profiles) so edge functions keep working
-- without per-function rewrites. This replaces the non-transactional
-- mirror-writes that useProfile.ts and OnboardingFlow.tsx were doing.

-- 1. Add gender column to user_profiles (was only in user_profile before)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'gender'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN gender text;
  END IF;
END $$;

-- 2. Ensure user_profile has UNIQUE(user_id) so the trigger's ON CONFLICT works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profile_user_id_key'
      AND conrelid = 'public.user_profile'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.user_profile
        ADD CONSTRAINT user_profile_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
END $$;

-- 3. Backfill missing fields on user_profiles from legacy sources

-- gender from user_profile
UPDATE public.user_profiles up
SET gender = upr.gender
FROM public.user_profile upr
WHERE up.user_id = upr.user_id
  AND up.gender IS NULL
  AND upr.gender IS NOT NULL;

-- date_of_birth from user_profile.dob
UPDATE public.user_profiles up
SET date_of_birth = upr.dob
FROM public.user_profile upr
WHERE up.user_id = upr.user_id
  AND up.date_of_birth IS NULL
  AND upr.dob IS NOT NULL;

-- full_name from profiles (auth-auto-created)
UPDATE public.user_profiles up
SET full_name = p.full_name
FROM public.profiles p
WHERE up.user_id = p.id
  AND (up.full_name IS NULL OR up.full_name = '')
  AND p.full_name IS NOT NULL
  AND p.full_name <> '';

-- avatar_url from profiles
UPDATE public.user_profiles up
SET avatar_url = p.avatar_url
FROM public.profiles p
WHERE up.user_id = p.id
  AND up.avatar_url IS NULL
  AND p.avatar_url IS NOT NULL;

-- 4. Trigger: mirror user_profiles -> user_profile + profiles
CREATE OR REPLACE FUNCTION public.sync_profile_mirrors()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mirror name/dob/gender into user_profile (legacy AI read path)
  INSERT INTO public.user_profile (user_id, name, dob, gender, updated_at)
  VALUES (NEW.user_id, NEW.full_name, NEW.date_of_birth, NEW.gender, now())
  ON CONFLICT (user_id) DO UPDATE
  SET
    name = COALESCE(EXCLUDED.name, public.user_profile.name),
    dob = COALESCE(EXCLUDED.dob, public.user_profile.dob),
    gender = COALESCE(EXCLUDED.gender, public.user_profile.gender),
    updated_at = now();

  -- Mirror full_name/avatar_url into profiles. Practitioner-specific
  -- fields on this table are untouched.
  INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
  VALUES (NEW.user_id, NEW.full_name, NEW.avatar_url, now())
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_mirrors_trigger ON public.user_profiles;
CREATE TRIGGER sync_profile_mirrors_trigger
  AFTER INSERT OR UPDATE OF full_name, date_of_birth, gender, avatar_url
  ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_mirrors();

-- 5. Trigger: mirror user_wellness_goals -> user_profile.goals
-- Keeps edge functions (yves-chat, generate-daily-briefing, etc.) that read
-- user_profile.goals working once the frontend stops writing it directly.
CREATE OR REPLACE FUNCTION public.sync_user_profile_goals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profile (user_id, goals, updated_at)
  VALUES (NEW.user_id, NEW.goals, now())
  ON CONFLICT (user_id) DO UPDATE
  SET goals = EXCLUDED.goals,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_profile_goals_trigger ON public.user_wellness_goals;
CREATE TRIGGER sync_user_profile_goals_trigger
  AFTER INSERT OR UPDATE OF goals
  ON public.user_wellness_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_goals();

-- 6. Trigger: mirror user_injuries -> user_profile.injuries
CREATE OR REPLACE FUNCTION public.sync_user_profile_injuries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profile (user_id, injuries, updated_at)
  VALUES (NEW.user_id, NEW.injuries, now())
  ON CONFLICT (user_id) DO UPDATE
  SET injuries = EXCLUDED.injuries,
      updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_profile_injuries_trigger ON public.user_injuries;
CREATE TRIGGER sync_user_profile_injuries_trigger
  AFTER INSERT OR UPDATE OF injuries
  ON public.user_injuries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_profile_injuries();

-- 7. Re-run mirror backfill so user_profile/profiles reflect current
-- user_profiles state before the frontend stops writing to them directly.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT user_id, full_name, date_of_birth, gender, avatar_url
    FROM public.user_profiles
  LOOP
    INSERT INTO public.user_profile (user_id, name, dob, gender, updated_at)
    VALUES (r.user_id, r.full_name, r.date_of_birth, r.gender, now())
    ON CONFLICT (user_id) DO UPDATE
    SET
      name = COALESCE(EXCLUDED.name, public.user_profile.name),
      dob = COALESCE(EXCLUDED.dob, public.user_profile.dob),
      gender = COALESCE(EXCLUDED.gender, public.user_profile.gender),
      updated_at = now();

    INSERT INTO public.profiles (id, full_name, avatar_url, updated_at)
    VALUES (r.user_id, r.full_name, r.avatar_url, now())
    ON CONFLICT (id) DO UPDATE
    SET
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
      updated_at = now();
  END LOOP;
END $$;

-- 8. Verify RLS on user_profiles (idempotent; policies already exist from
-- 20260208083446, this is defensive in case of drift).
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
      AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON public.user_profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
