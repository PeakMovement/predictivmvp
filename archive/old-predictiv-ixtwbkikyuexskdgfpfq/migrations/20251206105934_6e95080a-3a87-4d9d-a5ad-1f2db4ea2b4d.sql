-- =====================================================
-- COMPREHENSIVE RLS FIX MIGRATION (Retry)
-- =====================================================

-- 1. Drop existing policies on wearable_sessions and wearable_summary first
DROP POLICY IF EXISTS "Users can view their own wearable sessions" ON public.wearable_sessions;
DROP POLICY IF EXISTS "Service role full access to wearable sessions" ON public.wearable_sessions;
DROP POLICY IF EXISTS "Users can view their own wearable summary" ON public.wearable_summary;
DROP POLICY IF EXISTS "Service role full access to wearable summary" ON public.wearable_summary;

-- 2. Add proper policies to wearable_sessions
CREATE POLICY "Users can view their own wearable sessions"
ON public.wearable_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to wearable sessions"
ON public.wearable_sessions FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 3. Add proper policies to wearable_summary
CREATE POLICY "Users can view their own wearable summary"
ON public.wearable_summary FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to wearable summary"
ON public.wearable_summary FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 4. Fix function search paths for security
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.get_latest_insights()
RETURNS TABLE(metric text, deviation_pct numeric, risk_status text, insight text, suggestion text, updated_at timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT metric, deviation_pct, risk_status, insight, suggestion, updated_at
  FROM user_insights_view
  ORDER BY updated_at DESC
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;