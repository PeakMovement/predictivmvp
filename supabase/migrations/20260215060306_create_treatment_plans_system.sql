/*
  # Treatment Plans System Schema
  
  1. New Tables
    - `service_categories` - Available service types (physiotherapy, doctors, etc.)
    - `treatment_plans` - AI-generated health treatment plans for users
    - `treatment_plan_services` - Services included in each plan
    - `healthcare_practitioners` - Healthcare provider directory
    - `practitioner_specialties` - Link practitioners to service categories
    - `user_treatment_preferences` - User preferences for treatment matching
    - `treatment_plan_feedback` - User feedback on generated plans
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Service-role access for system operations
*/

-- 1. Service Categories
CREATE TABLE IF NOT EXISTS public.service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  typical_cost_range_min integer,
  typical_cost_range_max integer,
  icon text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service categories are viewable by everyone"
  ON public.service_categories FOR SELECT
  TO authenticated
  USING (true);

-- 2. Treatment Plans
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  plan_type text NOT NULL CHECK (plan_type IN ('best-fit', 'high-impact', 'progressive', 'budget-conscious')),
  total_cost integer NOT NULL DEFAULT 0,
  time_frame text,
  complexity_score numeric(3,2) DEFAULT 0.5,
  user_input text,
  analyzed_symptoms text[] DEFAULT '{}',
  goal text,
  match_score numeric(3,2),
  is_favorite boolean DEFAULT false,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own treatment plans"
  ON public.treatment_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own treatment plans"
  ON public.treatment_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own treatment plans"
  ON public.treatment_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own treatment plans"
  ON public.treatment_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. Treatment Plan Services
CREATE TABLE IF NOT EXISTS public.treatment_plan_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  service_category_id uuid NOT NULL REFERENCES public.service_categories(id),
  sessions integer NOT NULL DEFAULT 1,
  price_per_session integer NOT NULL,
  frequency text,
  description text,
  rationale text,
  evidence_level text CHECK (evidence_level IN ('high', 'medium', 'low')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.treatment_plan_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view services for their treatment plans"
  ON public.treatment_plan_services FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.treatment_plans
      WHERE treatment_plans.id = treatment_plan_services.treatment_plan_id
      AND treatment_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create services for their treatment plans"
  ON public.treatment_plan_services FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.treatment_plans
      WHERE treatment_plans.id = treatment_plan_services.treatment_plan_id
      AND treatment_plans.user_id = auth.uid()
    )
  );

-- 4. Healthcare Practitioners
CREATE TABLE IF NOT EXISTS public.healthcare_practitioners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  title text NOT NULL,
  specialty text NOT NULL,
  location text NOT NULL,
  city text,
  province text,
  online_available boolean DEFAULT false,
  rating numeric(2,1) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
  years_experience integer,
  qualifications text[] DEFAULT '{}',
  languages text[] DEFAULT '{}',
  bio text,
  consultation_fee integer,
  accepts_medical_aid boolean DEFAULT true,
  available_times jsonb,
  contact_email text,
  contact_phone text,
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.healthcare_practitioners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Healthcare practitioners are viewable by everyone"
  ON public.healthcare_practitioners FOR SELECT
  TO authenticated
  USING (true);

-- 5. Practitioner Specialties (linking table)
CREATE TABLE IF NOT EXISTS public.practitioner_specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id uuid NOT NULL REFERENCES public.healthcare_practitioners(id) ON DELETE CASCADE,
  service_category_id uuid NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  proficiency_level text CHECK (proficiency_level IN ('expert', 'experienced', 'competent')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(practitioner_id, service_category_id)
);

ALTER TABLE public.practitioner_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Practitioner specialties are viewable by everyone"
  ON public.practitioner_specialties FOR SELECT
  TO authenticated
  USING (true);

-- 6. User Treatment Preferences
CREATE TABLE IF NOT EXISTS public.user_treatment_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_location text,
  max_budget_monthly integer,
  prefer_online boolean DEFAULT false,
  preferred_gender text CHECK (preferred_gender IN ('male', 'female', 'no-preference')),
  medical_aid_provider text,
  chronic_conditions text[] DEFAULT '{}',
  allergies text[] DEFAULT '{}',
  current_medications text[] DEFAULT '{}',
  preferred_languages text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_treatment_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own treatment preferences"
  ON public.user_treatment_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own treatment preferences"
  ON public.user_treatment_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own treatment preferences"
  ON public.user_treatment_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Treatment Plan Feedback
CREATE TABLE IF NOT EXISTS public.treatment_plan_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  was_helpful boolean,
  feedback_text text,
  improvements_needed text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.treatment_plan_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback for their treatment plans"
  ON public.treatment_plan_feedback FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback for their treatment plans"
  ON public.treatment_plan_feedback FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8. Insert default service categories
INSERT INTO public.service_categories (name, display_name, description, typical_cost_range_min, typical_cost_range_max, icon) VALUES
  ('doctor', 'General Practitioner', 'Primary care physicians for general health concerns', 500, 1000, 'stethoscope'),
  ('specialist', 'Medical Specialist', 'Specialized medical care for specific conditions', 1000, 2500, 'user-md'),
  ('physiotherapy', 'Physiotherapy', 'Physical rehabilitation and pain management', 400, 800, 'heart-pulse'),
  ('dietitian', 'Dietitian/Nutritionist', 'Nutrition counseling and diet planning', 500, 900, 'utensils'),
  ('psychologist', 'Psychologist', 'Mental health counseling and therapy', 800, 1500, 'brain'),
  ('chiropractor', 'Chiropractor', 'Spinal manipulation and musculoskeletal care', 400, 700, 'bone'),
  ('biokineticist', 'Biokineticist', 'Exercise therapy and movement rehabilitation', 400, 700, 'running'),
  ('personal-trainer', 'Personal Trainer', 'Fitness coaching and exercise programming', 300, 600, 'dumbbell'),
  ('massage-therapist', 'Massage Therapy', 'Therapeutic massage and bodywork', 300, 600, 'hand'),
  ('occupational-therapist', 'Occupational Therapy', 'Daily living skills and adaptive strategies', 500, 900, 'wheelchair')
ON CONFLICT (name) DO NOTHING;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_treatment_plans_user_id ON public.treatment_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_created_at ON public.treatment_plans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_services_plan_id ON public.treatment_plan_services(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_practitioners_specialty ON public.healthcare_practitioners(specialty);
CREATE INDEX IF NOT EXISTS idx_practitioners_location ON public.healthcare_practitioners(location);
CREATE INDEX IF NOT EXISTS idx_practitioners_city ON public.healthcare_practitioners(city);
CREATE INDEX IF NOT EXISTS idx_practitioner_specialties_category ON public.practitioner_specialties(service_category_id);

-- 10. Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_treatment_plan_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER treatment_plans_updated_at
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_treatment_plan_updated_at();

CREATE TRIGGER practitioners_updated_at
  BEFORE UPDATE ON public.healthcare_practitioners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_treatment_plan_updated_at();
