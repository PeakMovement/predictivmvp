-- M2 Sub-task 8 — Retrospective Prediction Tracking
-- Logs Level 2 anomaly flags from daily briefings.
-- Outcome field is filled in later to track accuracy over time.

CREATE TABLE IF NOT EXISTS public.prediction_log (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                DATE        NOT NULL,
  flag_type           TEXT        NOT NULL,  -- e.g. 'hrv_below_baseline', 'acwr_danger', 'allostatic_high'
  flag_key            TEXT,                  -- formula key: 'F-06', 'F-14', etc.
  prediction_text     TEXT        NOT NULL,  -- natural language summary at briefing time
  level               INTEGER     NOT NULL DEFAULT 2 CHECK (level IN (1, 2, 3)),
  anomaly_score       NUMERIC,               -- score at time of logging (0–1)
  device_source       TEXT,
  actual_outcome      TEXT        CHECK (actual_outcome IN ('confirmed', 'not_confirmed', 'inconclusive')),
  outcome_notes       TEXT,
  outcome_recorded_at TIMESTAMPTZ,
  briefing_date       DATE,
  created_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, date, flag_type)
);

CREATE INDEX IF NOT EXISTS idx_prediction_log_user_date
  ON public.prediction_log (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_log_pending
  ON public.prediction_log (user_id, actual_outcome)
  WHERE actual_outcome IS NULL;

ALTER TABLE public.prediction_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own predictions"
  ON public.prediction_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update outcome on their own predictions"
  ON public.prediction_log FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own predictions"
  ON public.prediction_log FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to prediction_log"
  ON public.prediction_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
