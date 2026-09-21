-- =====================================================
-- FIX LAST TABLE AND RESTRICT ANONYMOUS ACCESS
-- =====================================================

-- 1. Enable RLS on users table (lowercase - different from Users)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on users table and recreate with TO authenticated
DROP POLICY IF EXISTS "Users can read own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;

CREATE POLICY "Users can read own record"
ON public.users FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own record"
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Service role full access to users"
ON public.users FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 2. Fix Bookings, Risk Scores, Users (uppercase), Wearables policies
-- Bookings
DROP POLICY IF EXISTS "Bookings" ON public."Bookings";
CREATE POLICY "Users can view their bookings"
ON public."Bookings" FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Risk Scores
DROP POLICY IF EXISTS "Risk Score" ON public."Risk Scores";
CREATE POLICY "Users can view their risk scores"
ON public."Risk Scores" FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users (uppercase)
DROP POLICY IF EXISTS "Users" ON public."Users";
CREATE POLICY "Users can view their own user record"
ON public."Users" FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Wearables
DROP POLICY IF EXISTS "Wearables are viewable by owners" ON public."Wearables";
CREATE POLICY "Users can view their wearables"
ON public."Wearables" FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix activity_trends
DROP POLICY IF EXISTS "Users can view their own activity trends" ON public.activity_trends;
DROP POLICY IF EXISTS "Service role full access to activity trends" ON public.activity_trends;

CREATE POLICY "Users can view their own activity trends"
ON public.activity_trends FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to activity trends"
ON public.activity_trends FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 4. Fix training_trends - drop and recreate with TO authenticated
DROP POLICY IF EXISTS "Users can view their own training trends" ON public.training_trends;
DROP POLICY IF EXISTS "Service role full access to training trends" ON public.training_trends;

CREATE POLICY "Users can view their own training trends"
ON public.training_trends FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to training trends"
ON public.training_trends FOR ALL TO service_role
USING (true)
WITH CHECK (true);