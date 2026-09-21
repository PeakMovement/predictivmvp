-- Baseline Profiles (M2 Sub-task 3)
-- Stores daily computed baseline values per user per device.
-- Written by calculate-baselines edge function after each wearable sync.
-- Read by generate-daily-briefing via the signal bridge (Sub-task 5).

CREATE TABLE IF NOT EXISTS public.baseline_profiles (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                        DATE        NOT NULL,
  device_source               TEXT        NOT NULL DEFAULT 'oura'
                                          CHECK (device_source IN ('oura', 'garmin', 'polar', 'none')),

  -- 7-day acute averages
  hrv_7d_avg                  NUMERIC,
  rhr_7d_avg                  NUMERIC,
  sleep_score_7d_avg          NUMERIC,
  sleep_efficiency_7d_avg     NUMERIC,
  load_7d_avg                 NUMERIC,

  -- 30-day chronic averages
  hrv_30d_avg                 NUMERIC,
  rhr_30d_avg                 NUMERIC,
  sleep_score_30d_avg         NUMERIC,
  sleep_efficiency_30d_avg    NUMERIC,
  load_30d_avg                NUMERIC,

  -- Deviation from 30-day baseline (%)
  -- Formula: (today_value - 30d_avg) / 30d_avg * 100
  hrv_deviation_pct           NUMERIC,
  rhr_deviation_pct           NUMERIC,
  sleep_deviation_pct         NUMERIC,

  -- ACWR: 7d load avg / 30d load avg
  -- Safe zone 0.8-1.3, Caution 1.3-1.5, Danger >1.5
  acwr                        NUMERIC,
  acwr_source                 TEXT,     -- 'full' | 'rpe_estimated' | 'unavailable'

  -- Recovery trend: 3-day HRV avg vs 7-day HRV avg
  -- >5% = improving, within ±5% = stable, <-5% = declining
  recovery_trend              TEXT      CHECK (recovery_trend IN ('improving', 'stable', 'declining')),

  -- Anomaly score: min(1.0, abs(deviation_pct) / 30)
  -- <0.3 = normal, 0.3-0.6 = noteworthy, >0.6 = significant
  anomaly_score               NUMERIC,

  -- HRV streak: consecutive days where today_hrv < (30d_avg * 0.9)
  hrv_streak_below_baseline   INTEGER   DEFAULT 0,

  -- Weekly load progression: this week vs last week as %
  -- Flag if >10% AND injury_history present
  weekly_load_progression_pct NUMERIC,

  -- Monotony index (F-04): mean(7-day TRIMP) / SD(7-day TRIMP)
  -- >2.0 triggers "same route, same pace" language
  monotony_index              NUMERIC,

  -- Data quality
  baseline_confidence         NUMERIC   DEFAULT 1.0
                                        CHECK (baseline_confidence >= 0 AND baseline_confidence <= 1),
  data_days_available         INTEGER,  -- how many days of data used

  -- Available formulas for this user+device combination
  -- Computed from device type + data availability
  available_formulas          TEXT[]    DEFAULT '{}',

  computed_at                 TIMESTAMPTZ DEFAULT now(),
  created_at                  TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, date, device_source)
);

-- Index for fast daily lookups
CREATE INDEX IF NOT EXISTS idx_baseline_profiles_user_date
  ON public.baseline_profiles (user_id, date DESC);

-- RLS
ALTER TABLE public.baseline_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own baselines"
  ON public.baseline_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access"
  ON public.baseline_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
