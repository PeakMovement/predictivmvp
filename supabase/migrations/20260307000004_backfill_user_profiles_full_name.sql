-- Backfill user_profiles.full_name from user_profile.name
-- Fixes existing users whose name was saved to user_profile but not user_profiles
UPDATE public.user_profiles up
SET full_name = upr.name
FROM public.user_profile upr
WHERE up.user_id = upr.user_id
  AND (up.full_name IS NULL OR up.full_name = '')
  AND upr.name IS NOT NULL
  AND upr.name <> '';
