-- M2 Sub-task 4 & 4B: Formula Engine Tables
-- 1. Add priority formula result columns to baseline_profiles
-- 2. Create user_life_formula table for LF-01 to LF-10

-- ── Sub-task 4: Individual formula columns ────────────────────────────

ALTER TABLE public.baseline_profiles
  -- F-06: HRV Suppression Index
  -- today_hrv vs 28-day avg as %. Oura/Polar=full, Garmin=partial
  ADD COLUMN IF NOT EXISTS f06_hrv_suppression_value  NUMERIC,
  ADD COLUMN IF NOT EXISTS f06_hrv_suppression_status TEXT,

  -- F-10: Sleep Debt Accumulation
  -- sum(8h - actual_hours) over 7 days. Oura=full, Garmin/Polar=partial
  ADD COLUMN IF NOT EXISTS f10_sleep_debt_hours       NUMERIC,
  ADD COLUMN IF NOT EXISTS f10_sleep_debt_status      TEXT,

  -- F-14: Allostatic Load Score
  -- Z-score composite of HRV, RHR, sleep deviations (0-1 scale)
  ADD COLUMN IF NOT EXISTS f14_allostatic_load_value  NUMERIC,
  ADD COLUMN IF NOT EXISTS f14_allostatic_load_status TEXT,

  -- F-19: Readiness Composite Score
  -- Weighted composite of HRV%, sleep%, ACWR safety, recovery trend
  ADD COLUMN IF NOT EXISTS f19_readiness_value        NUMERIC,
  ADD COLUMN IF NOT EXISTS f19_readiness_status       TEXT;

-- ── Sub-task 4B: user_life_formula table ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_life_formula (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  formula_id      TEXT        NOT NULL,   -- 'LF-01' ... 'LF-10'
  formula_name    TEXT        NOT NULL,
  score           NUMERIC,                -- 0-1 weighted score
  rank            INTEGER,                -- 1 = primary, 2/3 = secondary
  status          TEXT        NOT NULL    -- 'active' | 'unavailable'
                              CHECK (status IN ('active', 'unavailable')),
  device_source   TEXT,                   -- device that enables this formula
  assigned_at     TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, formula_id)
);

ALTER TABLE public.user_life_formula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own life formulas"
  ON public.user_life_formula FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_life_formula"
  ON public.user_life_formula FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_life_formula_user
  ON public.user_life_formula (user_id, rank);
