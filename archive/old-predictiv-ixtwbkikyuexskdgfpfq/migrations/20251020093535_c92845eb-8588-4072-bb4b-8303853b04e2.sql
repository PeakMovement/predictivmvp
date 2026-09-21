-- Phase 1: Create user_health_profiles table
CREATE TABLE user_health_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_synthesis TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  version INTEGER DEFAULT 1
);

CREATE INDEX idx_user_health_profiles_user ON user_health_profiles(user_id);
CREATE INDEX idx_user_health_profiles_generated ON user_health_profiles(generated_at DESC);

ALTER TABLE user_health_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own health profiles"
ON user_health_profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to health profiles"
ON user_health_profiles FOR ALL
USING (true)
WITH CHECK (true);

-- Phase 2: Add reasoning column to yves_profiles
ALTER TABLE yves_profiles ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- Phase 3: Create plan_adherence table
CREATE TABLE plan_adherence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  plan_type TEXT CHECK (plan_type IN ('nutrition', 'training')),
  
  -- Expected (from uploaded plan)
  expected_data JSONB DEFAULT '{}'::jsonb,
  
  -- Actual (from Fitbit)
  actual_data JSONB DEFAULT '{}'::jsonb,
  
  -- Compliance
  adherence_score NUMERIC(3,2) CHECK (adherence_score >= 0 AND adherence_score <= 1),
  deviation_reasons TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, plan_type)
);

CREATE INDEX idx_plan_adherence_user_date ON plan_adherence(user_id, date);

ALTER TABLE plan_adherence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan adherence"
ON plan_adherence FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to plan adherence"
ON plan_adherence FOR ALL
USING (true)
WITH CHECK (true);