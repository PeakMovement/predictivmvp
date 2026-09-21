-- Create document_processing_log table for tracking document analysis
CREATE TABLE IF NOT EXISTS public.document_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.user_documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  processing_steps JSONB DEFAULT '[]'::jsonb,
  CONSTRAINT fk_document FOREIGN KEY (document_id) REFERENCES public.user_documents(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.document_processing_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view their own processing logs"
ON public.document_processing_log
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all logs
CREATE POLICY "Service role full access to processing logs"
ON public.document_processing_log
FOR ALL
USING (true)
WITH CHECK (true);

-- Create yves_recommendations table for storing AI-generated recommendations
CREATE TABLE IF NOT EXISTS public.yves_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recommendation_text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('training', 'recovery', 'nutrition', 'medical', 'general')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  feedback_score INTEGER CHECK (feedback_score IN (-1, 1)),
  source TEXT DEFAULT 'document_analysis'
);

-- Enable RLS
ALTER TABLE public.yves_recommendations ENABLE ROW LEVEL SECURITY;

-- Users can view their own recommendations
CREATE POLICY "Users can view their own recommendations"
ON public.yves_recommendations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update feedback on their recommendations
CREATE POLICY "Users can update their own recommendation feedback"
ON public.yves_recommendations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role can manage all recommendations
CREATE POLICY "Service role full access to recommendations"
ON public.yves_recommendations
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_yves_recommendations_user_created ON public.yves_recommendations(user_id, created_at DESC);
CREATE INDEX idx_document_processing_log_user_doc ON public.document_processing_log(user_id, document_id);