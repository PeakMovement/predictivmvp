-- Fix: allow authenticated users to insert/update their own baselines
-- (previously only SELECT policy existed — upsert from Recalculate button was blocked)

-- Ensure unique constraint exists for onConflict: "user_id,metric"
ALTER TABLE public.user_baselines
  DROP CONSTRAINT IF EXISTS user_baselines_user_metric_unique;
ALTER TABLE public.user_baselines
  ADD CONSTRAINT user_baselines_user_metric_unique UNIQUE (user_id, metric);

-- INSERT policy
DROP POLICY IF EXISTS "Users can insert their own baselines" ON public.user_baselines;
CREATE POLICY "Users can insert their own baselines"
ON public.user_baselines FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
DROP POLICY IF EXISTS "Users can update their own baselines" ON public.user_baselines;
CREATE POLICY "Users can update their own baselines"
ON public.user_baselines FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
