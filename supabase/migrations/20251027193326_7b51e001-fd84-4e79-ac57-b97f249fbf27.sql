-- Create insight_history table for Yves chat history
CREATE TABLE IF NOT EXISTS public.insight_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.insight_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own insight history
CREATE POLICY "Users can view their own insight history"
ON public.insight_history
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own insight history
CREATE POLICY "Users can insert their own insight history"
ON public.insight_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Service role has full access
CREATE POLICY "Service role full access to insight_history"
ON public.insight_history
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_insight_history_user_created ON public.insight_history(user_id, created_at DESC);