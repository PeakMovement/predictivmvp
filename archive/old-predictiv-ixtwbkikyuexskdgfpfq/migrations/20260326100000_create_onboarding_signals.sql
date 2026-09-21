-- Stores the raw questionnaire answers from the 7-question onboarding flow.
-- Used by the Life Formula engine to determine which formulas, metrics,
-- layouts, and prompt styles to activate for each user.

CREATE TABLE IF NOT EXISTS public.onboarding_signals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Q1: Wearable device
  wearable TEXT CHECK (wearable IN ('oura', 'garmin', 'polar', 'none')),

  -- Q2: Training type
  training_type TEXT CHECK (training_type IN ('endurance', 'strength', 'team', 'mindbody', 'rehab')),

  -- Q3: Life stress level (1-10)
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),

  -- Q4: Sleep quality
  sleep_quality TEXT CHECK (sleep_quality IN ('solid', 'variable', 'short', 'disrupted')),

  -- Q5: Yves check-in compliance
  compliance TEXT CHECK (compliance IN ('high', 'medium', 'low')),

  -- Q6: Health goals (pick up to 2)
  health_goals TEXT[] DEFAULT '{}',

  -- Q7: Injury history
  injury_history TEXT CHECK (injury_history IN ('none', 'overuse', 'acute', 'current', 'multiple')),

  -- Derived signal flags (computed on insert, used by formula engine)
  -- These map directly to the decision map signal names
  is_endurance BOOLEAN GENERATED ALWAYS AS (training_type = 'endurance') STORED,
  is_strength BOOLEAN GENERATED ALWAYS AS (training_type = 'strength') STORED,
  is_team_sport BOOLEAN GENERATED ALWAYS AS (training_type = 'team') STORED,
  is_mind_body BOOLEAN GENERATED ALWAYS AS (training_type = 'mindbody') STORED,
  is_rehab_focus BOOLEAN GENERATED ALWAYS AS (training_type = 'rehab') STORED,

  stress_low BOOLEAN GENERATED ALWAYS AS (stress_level IS NOT NULL AND stress_level <= 3) STORED,
  stress_med BOOLEAN GENERATED ALWAYS AS (stress_level IS NOT NULL AND stress_level BETWEEN 4 AND 6) STORED,
  stress_high BOOLEAN GENERATED ALWAYS AS (stress_level IS NOT NULL AND stress_level >= 7) STORED,

  sleep_ok BOOLEAN GENERATED ALWAYS AS (sleep_quality = 'solid') STORED,
  sleep_poor BOOLEAN GENERATED ALWAYS AS (sleep_quality IN ('short', 'disrupted')) STORED,
  sleep_variable BOOLEAN GENERATED ALWAYS AS (sleep_quality = 'variable') STORED,

  comp_high BOOLEAN GENERATED ALWAYS AS (compliance = 'high') STORED,
  comp_med BOOLEAN GENERATED ALWAYS AS (compliance = 'medium') STORED,
  comp_low BOOLEAN GENERATED ALWAYS AS (compliance = 'low') STORED,

  inj_none BOOLEAN GENERATED ALWAYS AS (injury_history = 'none') STORED,
  inj_overuse BOOLEAN GENERATED ALWAYS AS (injury_history = 'overuse') STORED,
  inj_acute BOOLEAN GENERATED ALWAYS AS (injury_history = 'acute') STORED,
  inj_current BOOLEAN GENERATED ALWAYS AS (injury_history = 'current') STORED,
  inj_recurring BOOLEAN GENERATED ALWAYS AS (injury_history = 'multiple') STORED,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.onboarding_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signals"
  ON public.onboarding_signals FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signals"
  ON public.onboarding_signals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signals"
  ON public.onboarding_signals FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.onboarding_signals FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
