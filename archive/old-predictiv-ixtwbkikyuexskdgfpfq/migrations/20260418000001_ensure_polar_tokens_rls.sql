-- Re-assert RLS policies on polar_tokens.
-- Disconnect was silently failing because the DELETE policy on this table
-- was either missing or altered on the live DB, leaving authenticated users
-- unable to delete their own token row. This migration is idempotent and
-- recreates all four CRUD policies so the disconnect flow works reliably.

ALTER TABLE public.polar_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own polar tokens" ON public.polar_tokens;
DROP POLICY IF EXISTS "Users can insert own polar tokens" ON public.polar_tokens;
DROP POLICY IF EXISTS "Users can update own polar tokens" ON public.polar_tokens;
DROP POLICY IF EXISTS "Users can delete own polar tokens" ON public.polar_tokens;

CREATE POLICY "Users can read own polar tokens"
  ON public.polar_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own polar tokens"
  ON public.polar_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own polar tokens"
  ON public.polar_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own polar tokens"
  ON public.polar_tokens
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
