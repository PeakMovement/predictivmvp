-- Create oura_logs table for tracking sync operations
CREATE TABLE IF NOT EXISTS public.oura_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  entries_synced integer DEFAULT 0,
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.oura_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY "Users can view their own oura logs"
ON public.oura_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role full access
CREATE POLICY "Service role full access to oura logs"
ON public.oura_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add index for performance
CREATE INDEX idx_oura_logs_user_id ON public.oura_logs(user_id);
CREATE INDEX idx_oura_logs_created_at ON public.oura_logs(created_at DESC);