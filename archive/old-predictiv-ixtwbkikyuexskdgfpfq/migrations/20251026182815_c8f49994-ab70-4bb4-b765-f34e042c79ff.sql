-- Add email_preferences column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email_preferences jsonb DEFAULT '{"weeklySummary": true, "riskAlerts": true, "aiCoachRecommendations": true}'::jsonb;

-- Insert missing user record for authenticated user
INSERT INTO public.users (id, email, fitbit_connected, email_preferences)
VALUES (
  '125ca6dd-715f-4c65-9d83-39ea06978884'::uuid,
  'justin15muller@gmail.com',
  false,
  '{"weeklySummary": true, "riskAlerts": true, "aiCoachRecommendations": true}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  email_preferences = COALESCE(users.email_preferences, EXCLUDED.email_preferences);

-- Update RLS policies to allow users to read and update their own records
DROP POLICY IF EXISTS "Users can read own record" ON public.users;
CREATE POLICY "Users can read own record" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
CREATE POLICY "Users can insert own record" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);