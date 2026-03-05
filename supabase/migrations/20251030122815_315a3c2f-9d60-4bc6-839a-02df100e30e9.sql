-- Create user_injuries table
CREATE TABLE IF NOT EXISTS public.user_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  injuries TEXT[] DEFAULT '{}',
  injury_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_injuries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own injury history"
ON public.user_injuries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own injury history"
ON public.user_injuries FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own injury history"
ON public.user_injuries FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_lifestyle table
CREATE TABLE IF NOT EXISTS public.user_lifestyle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  daily_routine TEXT,
  work_schedule TEXT,
  stress_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_lifestyle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lifestyle"
ON public.user_lifestyle FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lifestyle"
ON public.user_lifestyle FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lifestyle"
ON public.user_lifestyle FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_interests table
CREATE TABLE IF NOT EXISTS public.user_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hobbies TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own interests"
ON public.user_interests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interests"
ON public.user_interests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interests"
ON public.user_interests FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_nutrition table
CREATE TABLE IF NOT EXISTS public.user_nutrition (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  diet_type TEXT,
  allergies TEXT[] DEFAULT '{}',
  eating_pattern TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_nutrition ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition"
ON public.user_nutrition FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition"
ON public.user_nutrition FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition"
ON public.user_nutrition FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_training table
CREATE TABLE IF NOT EXISTS public.user_training (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preferred_activities TEXT[] DEFAULT '{}',
  training_frequency TEXT,
  intensity_preference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_training ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training preferences"
ON public.user_training FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training preferences"
ON public.user_training FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training preferences"
ON public.user_training FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_medical table
CREATE TABLE IF NOT EXISTS public.user_medical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  conditions TEXT[] DEFAULT '{}',
  medications TEXT[] DEFAULT '{}',
  medical_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_medical ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own medical background"
ON public.user_medical FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own medical background"
ON public.user_medical FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medical background"
ON public.user_medical FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_wellness_goals table
CREATE TABLE IF NOT EXISTS public.user_wellness_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  goals TEXT[] DEFAULT '{}',
  target_date DATE,
  priority TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_wellness_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wellness goals"
ON public.user_wellness_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wellness goals"
ON public.user_wellness_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wellness goals"
ON public.user_wellness_goals FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_recovery table
CREATE TABLE IF NOT EXISTS public.user_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sleep_hours NUMERIC,
  sleep_quality TEXT,
  recovery_methods TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_recovery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recovery data"
ON public.user_recovery FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recovery data"
ON public.user_recovery FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery data"
ON public.user_recovery FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create user_mindset table
CREATE TABLE IF NOT EXISTS public.user_mindset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  motivation_factors TEXT[] DEFAULT '{}',
  mental_health_focus TEXT,
  stress_management TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.user_mindset ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mindset data"
ON public.user_mindset FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mindset data"
ON public.user_mindset FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mindset data"
ON public.user_mindset FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);