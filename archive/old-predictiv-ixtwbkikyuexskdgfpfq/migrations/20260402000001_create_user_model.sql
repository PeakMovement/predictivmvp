-- M2 Sub-task 6: user_model table
-- Accumulates weekly patterns, preferences, events, injuries, predictions, goals per user.
-- Written only by edge functions. Users can SELECT own rows, UPDATE active field, DELETE for POPIA.

CREATE TABLE IF NOT EXISTS public.user_model (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL
                              CHECK (category IN ('pattern', 'preference', 'event', 'injury', 'prediction', 'goal')),
  key             TEXT        NOT NULL,   -- e.g. 'sleep_pattern_weekday', 'hrv_trend_declining'
  value           JSONB       NOT NULL,   -- flexible structured data
  confidence      NUMERIC     DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source          TEXT        NOT NULL
                              CHECK (source IN ('weekly_analysis', 'user_reported', 'briefing_feedback', 'onboarding')),
  device_source   TEXT        CHECK (device_source IN ('oura', 'garmin', 'polar', 'yves', null)),
  first_detected  TIMESTAMPTZ DEFAULT now(),
  last_updated    TIMESTAMPTZ DEFAULT now(),
  active          BOOLEAN     DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, category, key)
);

CREATE INDEX IF NOT EXISTS idx_user_model_user_active
  ON public.user_model (user_id, active, category);

ALTER TABLE public.user_model ENABLE ROW LEVEL SECURITY;

-- Users can read their own entries
CREATE POLICY "Users can view their own model"
  ON public.user_model FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only toggle the active field (for transparency card)
CREATE POLICY "Users can update active field only"
  ON public.user_model FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own entries (POPIA compliance)
CREATE POLICY "Users can delete their own model entries"
  ON public.user_model FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Only edge functions (service role) can insert
CREATE POLICY "Service role full access"
  ON public.user_model FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
