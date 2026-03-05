-- Restrict update_user_context to service role only
-- This function is only called by edge functions, not client-side code

REVOKE EXECUTE ON FUNCTION public.update_user_context(uuid, text, jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_context(uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_user_context(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_context(uuid, text, jsonb) TO service_role;