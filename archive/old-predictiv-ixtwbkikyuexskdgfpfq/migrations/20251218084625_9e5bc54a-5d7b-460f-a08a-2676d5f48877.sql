-- Fix symptom_check_ins RLS policies to properly block anonymous access
-- The existing policies are RESTRICTIVE, they should be PERMISSIVE for proper user isolation

-- Drop existing RESTRICTIVE policies
DROP POLICY IF EXISTS "Users can view their own symptom check-ins" ON public.symptom_check_ins;
DROP POLICY IF EXISTS "Users can insert their own symptom check-ins" ON public.symptom_check_ins;
DROP POLICY IF EXISTS "Users can update their own symptom check-ins" ON public.symptom_check_ins;
DROP POLICY IF EXISTS "Users can delete their own symptom check-ins" ON public.symptom_check_ins;
DROP POLICY IF EXISTS "Service role full access to symptom check-ins" ON public.symptom_check_ins;

-- Ensure RLS is enabled
ALTER TABLE public.symptom_check_ins ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (prevents bypass)
ALTER TABLE public.symptom_check_ins FORCE ROW LEVEL SECURITY;

-- Create PERMISSIVE policies (default, uses OR logic - any matching policy allows access)
-- These policies explicitly require authentication AND ownership

CREATE POLICY "Authenticated users can view their own symptom check-ins"
ON public.symptom_check_ins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert their own symptom check-ins"
ON public.symptom_check_ins
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own symptom check-ins"
ON public.symptom_check_ins
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own symptom check-ins"
ON public.symptom_check_ins
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Service role access for backend operations
CREATE POLICY "Service role full access to symptom check-ins"
ON public.symptom_check_ins
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);