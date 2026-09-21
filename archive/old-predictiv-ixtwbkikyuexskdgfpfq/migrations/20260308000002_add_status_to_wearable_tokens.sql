-- Add status column to wearable_tokens to track token health
-- 'active'        — token is valid and syncing normally
-- 'token_expired' — Garmin/provider rejected the token; user must reconnect

ALTER TABLE public.wearable_tokens
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'token_expired'));

COMMENT ON COLUMN public.wearable_tokens.status IS
  'Token health: active = valid, token_expired = user must re-authenticate';
