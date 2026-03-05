-- =====================================================
-- FIX REMAINING TABLES WITHOUT RLS
-- =====================================================

-- 1. Enable RLS on user_insight_actions
ALTER TABLE public.user_insight_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ins_actions_insert" ON public.user_insight_actions;

CREATE POLICY "Users can view their own insight actions"
ON public.user_insight_actions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insight actions"
ON public.user_insight_actions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to insight actions"
ON public.user_insight_actions FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 2. Enable RLS on wearable_auto_data
ALTER TABLE public.wearable_auto_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wearable auto data"
ON public.wearable_auto_data FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to wearable auto data"
ON public.wearable_auto_data FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 3. Enable RLS on yves_feedback
ALTER TABLE public.yves_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own yves feedback"
ON public.yves_feedback FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own yves feedback"
ON public.yves_feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to yves feedback"
ON public.yves_feedback FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 4. Enable RLS on wearable_tokens (if not already)
ALTER TABLE public.wearable_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own tokens" ON public.wearable_tokens;
DROP POLICY IF EXISTS "Service role full access to tokens" ON public.wearable_tokens;

CREATE POLICY "Users can view their own tokens"
ON public.wearable_tokens FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to tokens"
ON public.wearable_tokens FOR ALL TO service_role
USING (true)
WITH CHECK (true);