/*
  # Create Oura Ring Integration Tables (Rebuild-Safe)
  
  This migration creates or rebuilds all tables required for the Predictiv × Oura Ring integration.
  Each table is dropped (if exists) and recreated to ensure a clean state during development.
  
  ## Tables Created
  
  1. **oura_tokens** - OAuth credentials and token management
  2. **oura_sleep** - Sleep period data with stages and metrics
  3. **oura_readiness** - Daily readiness scores and contributing factors
  4. **oura_activity** - Daily activity summaries and movement data
  5. **oura_stress** - Daily stress measurements and recovery status
  6. **oura_resilience** - Resilience metrics and stress adaptation
  7. **oura_spo2** - Blood oxygen saturation measurements
  8. **oura_vo2max** - VO2 max estimates and cardiovascular fitness
  9. **oura_cardiovascular_age** - Cardiovascular age estimates
  10. **oura_rest_mode** - Rest mode periods and status
  11. **oura_workout** - Workout sessions with detailed metrics
  12. **oura_ring_config** - Ring hardware configuration and settings
  
  ## Security
  - All tables have RLS enabled
  - Users can only access their own data (user_id = auth.uid())
  - Foreign keys cascade on user deletion
*/

-- Drop all tables if they exist (CASCADE to handle dependencies)
DROP TABLE IF EXISTS oura_ring_config CASCADE;
DROP TABLE IF EXISTS oura_workout CASCADE;
DROP TABLE IF EXISTS oura_rest_mode CASCADE;
DROP TABLE IF EXISTS oura_cardiovascular_age CASCADE;
DROP TABLE IF EXISTS oura_vo2max CASCADE;
DROP TABLE IF EXISTS oura_spo2 CASCADE;
DROP TABLE IF EXISTS oura_resilience CASCADE;
DROP TABLE IF EXISTS oura_stress CASCADE;
DROP TABLE IF EXISTS oura_activity CASCADE;
DROP TABLE IF EXISTS oura_readiness CASCADE;
DROP TABLE IF EXISTS oura_sleep CASCADE;
DROP TABLE IF EXISTS oura_tokens CASCADE;

-- 1. oura_tokens: OAuth credentials and token management
CREATE TABLE oura_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at integer NOT NULL,
  token_type text DEFAULT 'Bearer',
  scope text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens"
  ON oura_tokens
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. oura_sleep: Sleep period data
CREATE TABLE oura_sleep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  bedtime_start timestamptz,
  bedtime_end timestamptz,
  score integer,
  efficiency integer,
  restfulness integer,
  latency integer,
  timing integer,
  total_sleep_duration integer,
  awake_time integer,
  light_sleep_duration integer,
  deep_sleep_duration integer,
  rem_sleep_duration integer,
  average_heart_rate numeric(5,2),
  lowest_heart_rate numeric(5,2),
  average_hrv numeric(5,2),
  average_breath numeric(5,2),
  temperature_delta numeric(5,2),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_sleep ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sleep data"
  ON oura_sleep
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sleep data"
  ON oura_sleep
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sleep data"
  ON oura_sleep
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. oura_readiness: Daily readiness scores
CREATE TABLE oura_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  score integer,
  temperature_deviation numeric(5,2),
  temperature_trend_deviation numeric(5,2),
  activity_balance integer,
  body_temperature integer,
  hrv_balance integer,
  previous_day_activity integer,
  previous_night integer,
  recovery_index integer,
  resting_heart_rate integer,
  sleep_balance integer,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_readiness ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own readiness data"
  ON oura_readiness
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own readiness data"
  ON oura_readiness
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own readiness data"
  ON oura_readiness
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. oura_activity: Daily activity summaries
CREATE TABLE oura_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  score integer,
  active_calories integer,
  total_calories integer,
  steps integer,
  equivalent_walking_distance integer,
  high_activity_time integer,
  medium_activity_time integer,
  low_activity_time integer,
  non_wear_time integer,
  sedentary_time integer,
  inactivity_alerts integer,
  average_met_minutes numeric(8,2),
  target_calories integer,
  target_meters integer,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity data"
  ON oura_activity
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activity data"
  ON oura_activity
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own activity data"
  ON oura_activity
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. oura_stress: Daily stress measurements
CREATE TABLE oura_stress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  day_summary text,
  stress_high integer,
  recovery_high integer,
  day_stress numeric(5,2),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_stress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stress data"
  ON oura_stress
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stress data"
  ON oura_stress
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stress data"
  ON oura_stress
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. oura_resilience: Resilience metrics
CREATE TABLE oura_resilience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  level text,
  contributors jsonb,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_resilience ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resilience data"
  ON oura_resilience
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own resilience data"
  ON oura_resilience
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own resilience data"
  ON oura_resilience
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. oura_spo2: Blood oxygen saturation
CREATE TABLE oura_spo2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  spo2_percentage jsonb,
  breathing_disturbance_index numeric(5,2),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_spo2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spo2 data"
  ON oura_spo2
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own spo2 data"
  ON oura_spo2
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own spo2 data"
  ON oura_spo2
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. oura_vo2max: VO2 max estimates
CREATE TABLE oura_vo2max (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  vo2_max numeric(5,2),
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_vo2max ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vo2max data"
  ON oura_vo2max
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own vo2max data"
  ON oura_vo2max
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vo2max data"
  ON oura_vo2max
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 9. oura_cardiovascular_age: Cardiovascular age estimates
CREATE TABLE oura_cardiovascular_age (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  day date NOT NULL,
  vascular_age integer,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_cardiovascular_age ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cardiovascular age data"
  ON oura_cardiovascular_age
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own cardiovascular age data"
  ON oura_cardiovascular_age
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cardiovascular age data"
  ON oura_cardiovascular_age
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. oura_rest_mode: Rest mode periods
CREATE TABLE oura_rest_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  end_day date,
  start_day date,
  episodes jsonb,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_rest_mode ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rest mode data"
  ON oura_rest_mode
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own rest mode data"
  ON oura_rest_mode
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rest mode data"
  ON oura_rest_mode
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11. oura_workout: Workout sessions
CREATE TABLE oura_workout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  activity text,
  calories numeric(8,2),
  day date,
  distance numeric(10,2),
  end_datetime timestamptz,
  start_datetime timestamptz,
  intensity text,
  label text,
  source text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_workout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout data"
  ON oura_workout
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own workout data"
  ON oura_workout
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workout data"
  ON oura_workout
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 12. oura_ring_config: Ring hardware configuration
CREATE TABLE oura_ring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  oura_id text NOT NULL,
  color text,
  design text,
  firmware_version text,
  hardware_type text,
  set_up_at timestamptz,
  size integer,
  raw_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, oura_id)
);

ALTER TABLE oura_ring_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ring config"
  ON oura_ring_config
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ring config"
  ON oura_ring_config
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ring config"
  ON oura_ring_config
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for common queries
CREATE INDEX idx_oura_sleep_user_day ON oura_sleep(user_id, day DESC);
CREATE INDEX idx_oura_readiness_user_day ON oura_readiness(user_id, day DESC);
CREATE INDEX idx_oura_activity_user_day ON oura_activity(user_id, day DESC);
CREATE INDEX idx_oura_stress_user_day ON oura_stress(user_id, day DESC);
CREATE INDEX idx_oura_workout_user_day ON oura_workout(user_id, day DESC);
CREATE INDEX idx_oura_tokens_user ON oura_tokens(user_id);
