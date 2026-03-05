-- Create yves_memory_bank table for AI learning and context
CREATE TABLE public.yves_memory_bank (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  memory_key text NOT NULL,
  memory_value jsonb NOT NULL,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT yves_memory_bank_user_key_unique UNIQUE (user_id, memory_key)
);

-- Add index for fast lookups
CREATE INDEX idx_yves_memory_bank_user_key ON public.yves_memory_bank(user_id, memory_key);

-- Enable Row Level Security
ALTER TABLE public.yves_memory_bank ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own memory entries
CREATE POLICY "Users can view their own memory entries"
ON public.yves_memory_bank
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own memory entries
CREATE POLICY "Users can insert their own memory entries"
ON public.yves_memory_bank
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own memory entries
CREATE POLICY "Users can update their own memory entries"
ON public.yves_memory_bank
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy: Users can delete their own memory entries
CREATE POLICY "Users can delete their own memory entries"
ON public.yves_memory_bank
FOR DELETE
USING (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role full access to yves_memory_bank"
ON public.yves_memory_bank
FOR ALL
USING (true)
WITH CHECK (true);