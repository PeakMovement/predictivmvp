-- Fix: Make oura_tokens view SECURITY INVOKER (not DEFINER)
DROP VIEW IF EXISTS public.oura_tokens;
CREATE VIEW public.oura_tokens WITH (security_invoker = true) AS
SELECT user_id, access_token, refresh_token, expires_at, scope, created_at
FROM public.wearable_tokens
WHERE user_id = auth.uid() AND (scope ILIKE '%extapi%' OR scope = 'oura');