-- Create enums for injury profile
CREATE TYPE public.injury_type_enum AS ENUM (
  'muscle_strain',
  'ligament_tear',
  'fracture',
  'surgery',
  'spinal',
  'tendinopathy',
  'other'
);

CREATE TYPE public.practitioner_type_enum AS ENUM (
  'physio',
  'surgeon',
  'sports_doctor',
  'biokineticist',
  'other'
);

CREATE TYPE public.injury_phase_enum AS ENUM (
  'acute',
  'sub_acute',
  'rehabilitation',
  'return_to_sport',
  'full_clearance'
);

-- Create user_injury_profiles table
CREATE TABLE public.user_injury_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  injury_type public.injury_type_enum NOT NULL,
  body_location text NOT NULL,
  injury_date date NOT NULL,
  surgery_date date,
  treating_practitioner_name text,
  treating_practitioner_type public.practitioner_type_enum,
  load_restrictions text,
  clearance_milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_return_date date,
  current_phase public.injury_phase_enum NOT NULL DEFAULT 'acute',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_injury_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own injury profiles"
  ON public.user_injury_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own injury profiles"
  ON public.user_injury_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own injury profiles"
  ON public.user_injury_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own injury profiles"
  ON public.user_injury_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to injury profiles"
  ON public.user_injury_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_user_injury_profiles_user_id
  ON public.user_injury_profiles(user_id);

CREATE INDEX idx_user_injury_profiles_active
  ON public.user_injury_profiles(user_id, is_active)
  WHERE is_active = true;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_injury_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER injury_profiles_updated_at
  BEFORE UPDATE ON public.user_injury_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_injury_profile_updated_at();
