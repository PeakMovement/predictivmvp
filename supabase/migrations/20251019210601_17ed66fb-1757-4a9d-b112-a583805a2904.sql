-- Storage bucket for user documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_documents', 'user_documents', false);

-- Enable RLS on storage.objects for user_documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Document metadata table
CREATE TABLE user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_type TEXT CHECK (document_type IN ('nutrition', 'medical', 'training')) NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  parsed_content JSONB,
  ai_summary TEXT,
  tags TEXT[],
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed'))
);

ALTER TABLE user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents"
ON user_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON user_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON user_documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_documents"
ON user_documents FOR ALL
USING (true)
WITH CHECK (true);

-- Document insights table
CREATE TABLE document_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES user_documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  insight_data JSONB NOT NULL,
  confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own insights"
ON document_insights FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to document_insights"
ON document_insights FOR ALL
USING (true)
WITH CHECK (true);

-- Enhanced user context table
CREATE TABLE user_context_enhanced (
  user_id UUID PRIMARY KEY,
  nutrition_profile JSONB DEFAULT '{}',
  medical_profile JSONB DEFAULT '{}',
  training_profile JSONB DEFAULT '{}',
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_context_enhanced ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own context"
ON user_context_enhanced FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own context"
ON user_context_enhanced FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context"
ON user_context_enhanced FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_context"
ON user_context_enhanced FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX idx_user_documents_user_id ON user_documents(user_id);
CREATE INDEX idx_user_documents_type ON user_documents(document_type);
CREATE INDEX idx_document_insights_user_id ON document_insights(user_id);
CREATE INDEX idx_document_insights_document_id ON document_insights(document_id);

-- Helper function to update user context
CREATE OR REPLACE FUNCTION update_user_context(
  p_user_id UUID,
  p_field TEXT,
  p_data JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_context_enhanced (user_id, nutrition_profile, medical_profile, training_profile)
  VALUES (
    p_user_id,
    CASE WHEN p_field = 'nutrition_profile' THEN p_data ELSE '{}'::jsonb END,
    CASE WHEN p_field = 'medical_profile' THEN p_data ELSE '{}'::jsonb END,
    CASE WHEN p_field = 'training_profile' THEN p_data ELSE '{}'::jsonb END
  )
  ON CONFLICT (user_id) DO UPDATE SET
    nutrition_profile = CASE WHEN p_field = 'nutrition_profile' THEN p_data ELSE user_context_enhanced.nutrition_profile END,
    medical_profile = CASE WHEN p_field = 'medical_profile' THEN p_data ELSE user_context_enhanced.medical_profile END,
    training_profile = CASE WHEN p_field = 'training_profile' THEN p_data ELSE user_context_enhanced.training_profile END,
    last_updated = NOW();
END;
$$;