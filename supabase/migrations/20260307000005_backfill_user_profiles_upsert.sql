-- Backfill user_profiles.full_name from user_profile.name
-- Handles two cases:
--   1. Row exists in user_profiles but full_name is null → UPDATE
--   2. No row in user_profiles yet but name exists in user_profile → INSERT

-- Case 1: already handled by migration 20260307000004, kept here for idempotency
UPDATE public.user_profiles up
SET full_name = upr.name
FROM public.user_profile upr
WHERE up.user_id = upr.user_id
  AND (up.full_name IS NULL OR up.full_name = '')
  AND upr.name IS NOT NULL
  AND upr.name <> '';

-- Case 2: insert a minimal user_profiles row for users who have a name in
-- user_profile but never got a row in user_profiles (onboarding debounce bug)
INSERT INTO public.user_profiles (user_id, full_name, updated_at)
SELECT
  upr.user_id,
  upr.name,
  now()
FROM public.user_profile upr
WHERE upr.name IS NOT NULL
  AND upr.name <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = upr.user_id
  )
ON CONFLICT (user_id) DO NOTHING;
