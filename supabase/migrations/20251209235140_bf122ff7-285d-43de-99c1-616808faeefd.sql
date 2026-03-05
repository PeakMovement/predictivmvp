-- Create triage_results table for storing provider predictions and memory
CREATE TABLE public.triage_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  issue_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  recommended_provider TEXT NOT NULL,
  confidence_score NUMERIC NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  reasoning TEXT NOT NULL,
  contextual_factors JSONB DEFAULT '{}'::jsonb,
  data_sources_used TEXT[],
  flags TEXT[],
  action_taken TEXT,
  outcome_feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for efficient queries
CREATE INDEX idx_triage_results_user_id ON public.triage_results(user_id);
CREATE INDEX idx_triage_results_created_at ON public.triage_results(created_at DESC);
CREATE INDEX idx_triage_results_provider ON public.triage_results(recommended_provider);

-- Enable RLS
ALTER TABLE public.triage_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own triage results"
  ON public.triage_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own triage results"
  ON public.triage_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own triage results"
  ON public.triage_results FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to triage results"
  ON public.triage_results FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER set_triage_results_updated_at
  BEFORE UPDATE ON public.triage_results
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();