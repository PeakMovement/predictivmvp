-- =====================================================
-- FIX SECURITY DEFINER VIEWS
-- =====================================================

-- 1. Recreate feedback_summary as security invoker
DROP VIEW IF EXISTS public.feedback_summary CASCADE;
CREATE VIEW public.feedback_summary 
WITH (security_invoker = true)
AS
SELECT 
  metric,
  COUNT(*) as total_feedback,
  AVG(feedback_score) as avg_score
FROM public.feedback
GROUP BY metric;

-- 2. Recreate insight_engagement_summary as security invoker
DROP VIEW IF EXISTS public.insight_engagement_summary CASCADE;
CREATE VIEW public.insight_engagement_summary
WITH (security_invoker = true)
AS
SELECT 
  f.metric,
  COUNT(DISTINCT ih.id) as insight_count,
  COUNT(DISTINCT f.id) as feedback_count,
  CASE WHEN COUNT(DISTINCT ih.id) > 0 
    THEN ROUND((COUNT(DISTINCT f.id)::numeric / COUNT(DISTINCT ih.id)::numeric) * 100, 2)
    ELSE 0 
  END as engagement_rate
FROM public.insight_history ih
LEFT JOIN public.feedback f ON f.user_id = ih.user_id
GROUP BY f.metric;

-- 3. Recreate user_insights_view as security invoker
DROP VIEW IF EXISTS public.user_insights_view CASCADE;
CREATE VIEW public.user_insights_view
WITH (security_invoker = true)
AS
SELECT 
  ar.metric,
  ar.deviation_pct,
  ar.risk_status,
  ar.recommendation as insight,
  ar.adaptive_suggestion as suggestion,
  ar.updated_at
FROM public.adaptive_recommendations ar
WHERE ar.user_id = auth.uid();

-- 4. Recreate yves_timeline_view as security invoker
DROP VIEW IF EXISTS public.yves_timeline_view CASCADE;
CREATE VIEW public.yves_timeline_view
WITH (security_invoker = true)
AS
SELECT 
  ar.user_id,
  ar.metric,
  ub.rolling_avg as baseline_value,
  ud.current_value,
  ud.deviation,
  ar.recommendation,
  ar.generated_at
FROM public.adaptive_recommendations ar
LEFT JOIN public.user_baselines ub ON ub.user_id = ar.user_id AND ub.metric = ar.metric
LEFT JOIN public.user_deviations ud ON ud.user_id = ar.user_id AND ud.metric = ar.metric
WHERE ar.user_id = auth.uid();

-- 5. Recreate oura_tokens view as security invoker
DROP VIEW IF EXISTS public.oura_tokens CASCADE;
CREATE VIEW public.oura_tokens
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  access_token,
  refresh_token,
  expires_at,
  scope,
  created_at
FROM public.wearable_tokens
WHERE user_id = auth.uid();

-- 6. Enable RLS on remaining tables that need it
ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_daily ENABLE ROW LEVEL SECURITY;

-- 7. Add user-specific policies for health_data
DROP POLICY IF EXISTS "Allow anon insert" ON public.health_data;
DROP POLICY IF EXISTS "Allow anon select" ON public.health_data;

CREATE POLICY "Users can view their own health data"
ON public.health_data FOR SELECT TO authenticated
USING (auth.uid()::text = user_id);

CREATE POLICY "Service role full access to health data"
ON public.health_data FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 8. Fix health_daily policies
DROP POLICY IF EXISTS "Allow anon insert" ON public.health_daily;
DROP POLICY IF EXISTS "Allow anon select" ON public.health_daily;

CREATE POLICY "Users can view their own health daily"
ON public.health_daily FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to health daily"
ON public.health_daily FOR ALL TO service_role
USING (true)
WITH CHECK (true);