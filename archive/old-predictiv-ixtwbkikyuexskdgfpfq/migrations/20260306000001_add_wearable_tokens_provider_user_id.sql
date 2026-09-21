-- Add provider_user_id to wearable_tokens
-- Stores the wearable provider's stable user identifier (e.g. Garmin's userId UUID).
-- This is distinct from the OAuth access_token which rotates on refresh,
-- enabling garmin-webhook to resolve users even after token rotation.

ALTER TABLE public.wearable_tokens
  ADD COLUMN IF NOT EXISTS provider_user_id TEXT;

-- Index for fast webhook lookup by provider_user_id + scope
CREATE INDEX IF NOT EXISTS idx_wearable_tokens_provider_user_id
  ON public.wearable_tokens (provider_user_id, scope)
  WHERE provider_user_id IS NOT NULL;
