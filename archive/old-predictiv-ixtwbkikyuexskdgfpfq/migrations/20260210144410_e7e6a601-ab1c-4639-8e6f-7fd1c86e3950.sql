-- Allow multiple wearable providers per user by changing the PK from user_id alone
-- to a composite key of (user_id, scope).

-- 1. Drop the existing primary key
ALTER TABLE public.wearable_tokens DROP CONSTRAINT fitbit_tokens_pkey;

-- 2. Make scope NOT NULL with a default for existing rows
UPDATE public.wearable_tokens SET scope = 'oura' WHERE scope IS NULL;
ALTER TABLE public.wearable_tokens ALTER COLUMN scope SET NOT NULL;
ALTER TABLE public.wearable_tokens ALTER COLUMN scope SET DEFAULT 'oura';

-- 3. Add composite primary key
ALTER TABLE public.wearable_tokens ADD PRIMARY KEY (user_id, scope);

-- 4. Update the oura_tokens view to filter by scope
CREATE OR REPLACE VIEW public.oura_tokens AS
SELECT user_id, access_token, refresh_token, expires_at, scope, created_at
FROM public.wearable_tokens
WHERE user_id = auth.uid() AND scope ILIKE '%extapi%' OR scope = 'oura';