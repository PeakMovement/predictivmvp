-- Enable RLS on tables that are missing it

-- profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- terra_connections table
ALTER TABLE public.terra_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own terra connections"
ON public.terra_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own terra connections"
ON public.terra_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own terra connections"
ON public.terra_connections FOR DELETE
USING (auth.uid() = user_id);

-- user_deviations table
ALTER TABLE public.user_deviations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deviations"
ON public.user_deviations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to deviations"
ON public.user_deviations FOR ALL
USING (true)
WITH CHECK (true);

-- adaptive_recommendations table
ALTER TABLE public.adaptive_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations"
ON public.adaptive_recommendations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to recommendations"
ON public.adaptive_recommendations FOR ALL
USING (true)
WITH CHECK (true);

-- feedback table
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
ON public.feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback"
ON public.feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- insight_feedback table
ALTER TABLE public.insight_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insight feedback"
ON public.insight_feedback FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insight feedback"
ON public.insight_feedback FOR INSERT
WITH CHECK (auth.uid() = user_id);