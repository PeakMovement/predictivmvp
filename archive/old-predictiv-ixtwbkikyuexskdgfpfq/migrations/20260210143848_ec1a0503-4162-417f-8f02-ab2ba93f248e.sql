-- Temporary storage for Garmin OAuth 2.0 PKCE state (code_verifier)
-- Edge functions use service_role so they bypass RLS, but we enable it for defense-in-depth
CREATE TABLE public.garmin_oauth_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  state TEXT NOT NULL UNIQUE,
  code_verifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Enable RLS (service_role bypasses this; no user-facing policies needed)
ALTER TABLE public.garmin_oauth_state ENABLE ROW LEVEL SECURITY;

-- Index for fast lookup by state (used during callback)
CREATE INDEX idx_garmin_oauth_state_state ON public.garmin_oauth_state (state);

-- Auto-cleanup of expired rows
CREATE OR REPLACE FUNCTION public.cleanup_expired_garmin_oauth_state()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.garmin_oauth_state WHERE expires_at < now();
END;
$$;