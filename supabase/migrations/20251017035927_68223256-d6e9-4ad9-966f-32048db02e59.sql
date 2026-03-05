-- Create function_execution_log table for tracking edge function runs
CREATE TABLE public.function_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending', 'running')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_message TEXT,
  user_id UUID,
  metadata JSONB
);

-- Enable RLS
ALTER TABLE public.function_execution_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage all logs
CREATE POLICY "Service role can manage logs"
ON public.function_execution_log
FOR ALL
USING (true)
WITH CHECK (true);

-- Users can view all logs (for developer dashboard visibility)
CREATE POLICY "Users can view logs"
ON public.function_execution_log
FOR SELECT
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.function_execution_log;