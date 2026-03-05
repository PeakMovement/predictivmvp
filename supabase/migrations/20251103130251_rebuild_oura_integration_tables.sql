/*
  # Rebuild Oura Ring Integration Tables - Complete Reset

  This migration drops and recreates all 12 tables required for the Predictiv × Oura integration.

  ## Purpose
  - Ensures clean state for Oura Ring data integration
  - Implements exact schema as specified in integration requirements
  - Enables Row Level Security (RLS) on all tables
  - Creates user-specific access policies (user_id = auth.uid())

  ## Tables Created

  1. **oura_tokens** - OAuth credentials and token management
     - `id` (uuid, primary key)
     - `user_id` (uuid, references auth.users)
     - `access_token` (text)
     - `refresh_token` (text)
     - `expires_at` (timestamptz)
     - `scope` (text)
     - `fetched_at` (timestamptz)

  2. **oura_sleep** - Sleep period data with stages and metrics
     - `id`, `user_id`, `day`, `total_sleep_duration`, `average_hrv`, `average_heart_rate`
     - `rem_sleep_duration`, `deep_sleep_duration`, `light_sleep_duration`
     - `bedtime_start`, `bedtime_end`, `efficiency`

  3. **oura_readiness** - Daily readiness scores and contributing factors
     - `id`, `user_id`, `day`, `score`, `contributors` (jsonb)
     - `temperature_deviation`, `temperature_trend_deviation`

  4. **oura_activity** - Daily activity summaries and movement data
     - `id`, `user_id`, `day`, `steps`, `total_calories`, `active_calories`
     - `inactivity_time`, `met_min_low`, `met_min_high`

  5. **oura_stress** - Daily stress measurements and recovery status
     - `id`, `user_id`, `day`, `stress_high`, `recovery_high`, `day_summary`

  6. **oura_resilience** - Resilience metrics and stress adaptation
     - `id`, `user_id`, `day`, `sleep_recovery`, `daytime_recovery`, `stress`, `level`

  7. **oura_spo2** - Blood oxygen saturation measurements
     - `id`, `user_id`, `day`, `spo2_percentage_avg`

  8. **oura_vo2max** - VO2 max estimates and cardiovascular fitness
     - `id`, `user_id`, `day`, `timestamp`, `vo2_max`

  9. **oura_cardiovascular_age** - Cardiovascular age estimates
     - `id`, `user_id`, `day`, `vascular_age`

  10. **oura_rest_mode** - Rest mode periods and status
      - `id`, `user_id`, `start_day`, `start_time`, `end_day`, `end_time`, `episodes` (jsonb)

  11. **oura_workout** - Workout sessions with detailed metrics
      - `id`, `user_id`, `activity`, `start_datetime`, `calories`, `source`, `duration`

  12. **oura_ring_config** - Ring hardware configuration and settings
      - `id`, `user_id`, `color`, `design`, `firmware_version`, `hardware_type`, `setup_at`, `size`

  ## Security
  - All tables have RLS enabled
  - Users can only access their own data (user_id = auth.uid())
  - Foreign keys cascade on user deletion (ON DELETE CASCADE)

  ## Indexes
  - Composite indexes on (user_id, day) for efficient date-based queries
  - Indexes on user_id for configuration and token lookups

  ## Verification Queries (for testing after migration)

  ```sql
  -- Check all tables exist
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name LIKE 'oura_%';

  -- Verify RLS is enabled
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'oura_%';

  -- Test insert (replace with actual user_id)
  INSERT INTO oura_tokens (user_id, access_token, refresh_token, expires_at, scope)
  VALUES (auth.uid(), 'test_token', 'test_refresh', NOW() + INTERVAL '1 hour', 'daily');
  ```
*/

-- =============================================================================
-- STEP 1: Drop all existing Oura tables (CASCADE to handle dependencies)
-- =============================================================================

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

-- =============================================================================
-- STEP 2: Create all 12 Oura integration tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. oura_tokens: OAuth credentials and token management
-- -----------------------------------------------------------------------------
CREATE TABLE oura_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  scope text,
  fetched_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE(user_id)
);

ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own oura tokens"
  ON oura_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own oura tokens"
  ON oura_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own oura tokens"
  ON oura_tokens
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own oura tokens"
  ON oura_tokens
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_tokens_user_id ON oura_tokens(user_id);

-- -----------------------------------------------------------------------------
-- 2. oura_sleep: Sleep period data with stages and metrics
-- -----------------------------------------------------------------------------
CREATE TABLE oura_sleep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  total_sleep_duration integer,
  average_hrv numeric,
  average_heart_rate numeric,
  rem_sleep_duration integer,
  deep_sleep_duration integer,
  light_sleep_duration integer,
  bedtime_start timestamptz,
  bedtime_end timestamptz,
  efficiency numeric
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

CREATE POLICY "Users can delete own sleep data"
  ON oura_sleep
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_sleep_user_day ON oura_sleep(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 3. oura_readiness: Daily readiness scores and contributing factors
-- -----------------------------------------------------------------------------
CREATE TABLE oura_readiness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  score integer,
  contributors jsonb,
  temperature_deviation numeric,
  temperature_trend_deviation numeric
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

CREATE POLICY "Users can delete own readiness data"
  ON oura_readiness
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_readiness_user_day ON oura_readiness(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 4. oura_activity: Daily activity summaries and movement data
-- -----------------------------------------------------------------------------
CREATE TABLE oura_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  steps integer,
  total_calories integer,
  active_calories integer,
  inactivity_time integer,
  met_min_low integer,
  met_min_high integer
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

CREATE POLICY "Users can delete own activity data"
  ON oura_activity
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_activity_user_day ON oura_activity(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 5. oura_stress: Daily stress measurements and recovery status
-- -----------------------------------------------------------------------------
CREATE TABLE oura_stress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  stress_high integer,
  recovery_high integer,
  day_summary text
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

CREATE POLICY "Users can delete own stress data"
  ON oura_stress
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_stress_user_day ON oura_stress(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 6. oura_resilience: Resilience metrics and stress adaptation
-- -----------------------------------------------------------------------------
CREATE TABLE oura_resilience (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  sleep_recovery numeric,
  daytime_recovery numeric,
  stress numeric,
  level text
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

CREATE POLICY "Users can delete own resilience data"
  ON oura_resilience
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_resilience_user_day ON oura_resilience(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 7. oura_spo2: Blood oxygen saturation measurements
-- -----------------------------------------------------------------------------
CREATE TABLE oura_spo2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  spo2_percentage_avg numeric
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

CREATE POLICY "Users can delete own spo2 data"
  ON oura_spo2
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_spo2_user_day ON oura_spo2(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 8. oura_vo2max: VO2 max estimates and cardiovascular fitness
-- -----------------------------------------------------------------------------
CREATE TABLE oura_vo2max (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  timestamp timestamptz,
  vo2_max numeric
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

CREATE POLICY "Users can delete own vo2max data"
  ON oura_vo2max
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_vo2max_user_day ON oura_vo2max(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 9. oura_cardiovascular_age: Cardiovascular age estimates
-- -----------------------------------------------------------------------------
CREATE TABLE oura_cardiovascular_age (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  vascular_age numeric
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

CREATE POLICY "Users can delete own cardiovascular age data"
  ON oura_cardiovascular_age
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_cardiovascular_age_user_day ON oura_cardiovascular_age(user_id, day DESC);

-- -----------------------------------------------------------------------------
-- 10. oura_rest_mode: Rest mode periods and status
-- -----------------------------------------------------------------------------
CREATE TABLE oura_rest_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_day date,
  start_time timestamptz,
  end_day date,
  end_time timestamptz,
  episodes jsonb
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

CREATE POLICY "Users can delete own rest mode data"
  ON oura_rest_mode
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_rest_mode_user_start ON oura_rest_mode(user_id, start_day DESC);

-- -----------------------------------------------------------------------------
-- 11. oura_workout: Workout sessions with detailed metrics
-- -----------------------------------------------------------------------------
CREATE TABLE oura_workout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity text,
  start_datetime timestamptz,
  calories integer,
  source text,
  duration integer
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

CREATE POLICY "Users can delete own workout data"
  ON oura_workout
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_workout_user_datetime ON oura_workout(user_id, start_datetime DESC);

-- -----------------------------------------------------------------------------
-- 12. oura_ring_config: Ring hardware configuration and settings
-- -----------------------------------------------------------------------------
CREATE TABLE oura_ring_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  color text,
  design text,
  firmware_version text,
  hardware_type text,
  setup_at timestamptz,
  size integer
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

CREATE POLICY "Users can delete own ring config"
  ON oura_ring_config
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_oura_ring_config_user ON oura_ring_config(user_id);

-- =============================================================================
-- STEP 3: Add table comments for documentation
-- =============================================================================

COMMENT ON TABLE oura_tokens IS 'OAuth credentials for Oura Ring API authentication';
COMMENT ON TABLE oura_sleep IS 'Sleep period data with stages and metrics from Oura Ring';
COMMENT ON TABLE oura_readiness IS 'Daily readiness scores and contributing factors';
COMMENT ON TABLE oura_activity IS 'Daily activity summaries and movement data';
COMMENT ON TABLE oura_stress IS 'Daily stress measurements and recovery status';
COMMENT ON TABLE oura_resilience IS 'Resilience metrics and stress adaptation data';
COMMENT ON TABLE oura_spo2 IS 'Blood oxygen saturation measurements';
COMMENT ON TABLE oura_vo2max IS 'VO2 max estimates and cardiovascular fitness';
COMMENT ON TABLE oura_cardiovascular_age IS 'Cardiovascular age estimates';
COMMENT ON TABLE oura_rest_mode IS 'Rest mode periods and status tracking';
COMMENT ON TABLE oura_workout IS 'Workout sessions with detailed metrics';
COMMENT ON TABLE oura_ring_config IS 'Ring hardware configuration and settings';
