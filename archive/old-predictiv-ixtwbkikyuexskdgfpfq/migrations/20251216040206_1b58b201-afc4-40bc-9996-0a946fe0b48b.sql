-- Add memory_cleared_at timestamp to profiles table for auto-memory safeguard
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS memory_cleared_at timestamp with time zone DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.memory_cleared_at IS 'Timestamp of last chat history clear - used to filter out auto-captured memories older than this';

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_profiles_memory_cleared_at ON public.profiles(memory_cleared_at) WHERE memory_cleared_at IS NOT NULL;