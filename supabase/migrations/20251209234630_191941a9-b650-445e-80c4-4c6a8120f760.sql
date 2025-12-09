-- Create symptom_check_ins table for Phase 1 Data Foundation
CREATE TABLE public.symptom_check_ins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symptom_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('mild', 'moderate', 'severe')),
  description TEXT,
  body_location TEXT,
  onset_time TIMESTAMP WITH TIME ZONE,
  duration_hours NUMERIC,
  related_metrics JSONB DEFAULT '{}'::jsonb,
  triggers TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient user queries
CREATE INDEX idx_symptom_check_ins_user_id ON public.symptom_check_ins(user_id);
CREATE INDEX idx_symptom_check_ins_created_at ON public.symptom_check_ins(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.symptom_check_ins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own symptom check-ins"
  ON public.symptom_check_ins
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own symptom check-ins"
  ON public.symptom_check_ins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own symptom check-ins"
  ON public.symptom_check_ins
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own symptom check-ins"
  ON public.symptom_check_ins
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to symptom check-ins"
  ON public.symptom_check_ins
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER set_symptom_check_ins_updated_at
  BEFORE UPDATE ON public.symptom_check_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();