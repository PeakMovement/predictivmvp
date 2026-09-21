-- Replaces the old auth.users triggers (auth schema is managed and cannot hold
-- custom triggers). Called by the app once a session exists; idempotent.
CREATE OR REPLACE FUNCTION public.ensure_user_bootstrap()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  uemail text;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  SELECT email INTO uemail FROM auth.users WHERE id = uid;

  INSERT INTO public.users (id, email, created_at)
  VALUES (uid, uemail, now())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (user_id)
  VALUES (uid)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_bootstrap() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_user_bootstrap() TO authenticated;