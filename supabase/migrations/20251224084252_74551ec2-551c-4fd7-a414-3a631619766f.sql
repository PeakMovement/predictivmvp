-- Create medical_finder_sessions table for session persistence
CREATE TABLE public.medical_finder_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  current_step TEXT NOT NULL DEFAULT 'symptoms',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique partial index to ensure only one active session per user
CREATE UNIQUE INDEX idx_one_active_session_per_user 
ON public.medical_finder_sessions (user_id) 
WHERE status = 'active';

-- Create index for efficient lookups
CREATE INDEX idx_medical_finder_sessions_user_status 
ON public.medical_finder_sessions (user_id, status);

-- Enable Row Level Security
ALTER TABLE public.medical_finder_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.medical_finder_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own sessions" 
ON public.medical_finder_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own sessions" 
ON public.medical_finder_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access to sessions" 
ON public.medical_finder_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger to update last_updated_at
CREATE TRIGGER update_medical_finder_sessions_updated_at
BEFORE UPDATE ON public.medical_finder_sessions
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();