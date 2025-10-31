-- Create daily_briefings table for Yves' automated morning summaries
-- Stores personalized health briefings generated from wearable and memory data

CREATE TABLE IF NOT EXISTS public.daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  content text NOT NULL,
  context_used jsonb,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own briefings"
  ON public.daily_briefings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to briefings"
  ON public.daily_briefings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_daily_briefings_user_date 
  ON public.daily_briefings(user_id, date DESC);

COMMENT ON TABLE public.daily_briefings IS 'AI-generated daily health briefings from Yves Intelligence';
COMMENT ON COLUMN public.daily_briefings.content IS 'Natural language summary with recovery, sleep, activity, and tips';
COMMENT ON COLUMN public.daily_briefings.context_used IS 'JSON snapshot of wearable and memory data used to generate briefing';