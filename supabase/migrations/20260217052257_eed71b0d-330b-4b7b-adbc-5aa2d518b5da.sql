
-- Add generation_id and refresh_nonce columns to daily_briefings
ALTER TABLE public.daily_briefings
  ADD COLUMN IF NOT EXISTS generation_id UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS refresh_nonce UUID;

-- Drop the existing unique constraint if it exists (user_id, date, category, focus_mode)
-- We need to find and drop it first
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.table_name = 'daily_briefings'
    AND tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.daily_briefings DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Create index for efficient lookups (most recent briefing per user/date/focus_mode)
CREATE INDEX IF NOT EXISTS idx_daily_briefings_latest
  ON public.daily_briefings (user_id, date DESC, focus_mode, created_at DESC);
