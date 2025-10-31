-- Extend insight_history table to track context and provider details
-- This enables analysis of AI response quality and data usage

ALTER TABLE public.insight_history
ADD COLUMN IF NOT EXISTS context_used text,
ADD COLUMN IF NOT EXISTS provider text DEFAULT 'openai',
ADD COLUMN IF NOT EXISTS response_quality integer;

COMMENT ON COLUMN public.insight_history.context_used IS 'Wearable and health context data used to generate this response';
COMMENT ON COLUMN public.insight_history.provider IS 'AI provider used (openai, lovable, etc.)';
COMMENT ON COLUMN public.insight_history.response_quality IS 'Optional user rating of response quality (1-5)';