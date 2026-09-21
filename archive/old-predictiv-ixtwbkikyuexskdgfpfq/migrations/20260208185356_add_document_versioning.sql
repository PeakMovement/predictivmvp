/*
  # Add Document Versioning Support

  1. Schema Changes
    - Add version tracking columns to `user_documents` table:
      - `version` (integer): Current version number, defaults to 1
      - `is_latest` (boolean): Whether this is the latest version
      - `parent_document_id` (uuid): Reference to the original document for version chains
      - `version_notes` (text): Optional notes about this version

  2. New Tables
    - `document_versions` table:
      - Stores complete history of document versions
      - Each version preserves: file_url, file_name, ai_summary, tags, processed content
      - Includes version metadata: version_number, created_at, restored_from
    
  3. Security
    - Enable RLS on `document_versions` table
    - Users can only view their own document versions
    - Service role has full access for system operations

  4. Functions
    - `create_document_version()`: Automatically create version when updating document
    - `restore_document_version()`: Restore a previous version as current

  5. Indexes
    - Index on document_id for fast version lookups
    - Index on user_id for user-scoped queries
*/

-- Add versioning columns to user_documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'version'
  ) THEN
    ALTER TABLE public.user_documents ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'is_latest'
  ) THEN
    ALTER TABLE public.user_documents ADD COLUMN is_latest BOOLEAN DEFAULT true NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'parent_document_id'
  ) THEN
    ALTER TABLE public.user_documents ADD COLUMN parent_document_id UUID REFERENCES public.user_documents(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_documents' AND column_name = 'version_notes'
  ) THEN
    ALTER TABLE public.user_documents ADD COLUMN version_notes TEXT;
  END IF;
END $$;

-- Create document_versions table for version history
CREATE TABLE IF NOT EXISTS public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.user_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  ai_summary TEXT,
  tags TEXT[],
  parsed_content JSONB,
  processing_status TEXT DEFAULT 'completed',
  restored_from_version INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version_number)
);

-- Enable RLS on document_versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own document versions
CREATE POLICY "Users can view their own document versions"
ON public.document_versions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role full access to document_versions"
ON public.document_versions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id 
ON public.document_versions(document_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_user_id 
ON public.document_versions(user_id);

CREATE INDEX IF NOT EXISTS idx_document_versions_created_at 
ON public.document_versions(created_at DESC);

-- Function to create a version snapshot before updating a document
CREATE OR REPLACE FUNCTION create_document_version_snapshot()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create snapshot if the file_url is changing (new file uploaded)
  IF TG_OP = 'UPDATE' AND OLD.file_url IS DISTINCT FROM NEW.file_url THEN
    -- Save the old version to history
    INSERT INTO public.document_versions (
      document_id,
      user_id,
      version_number,
      file_url,
      file_name,
      file_size,
      ai_summary,
      tags,
      parsed_content,
      processing_status,
      created_at
    ) VALUES (
      OLD.id,
      OLD.user_id,
      OLD.version,
      OLD.file_url,
      OLD.file_name,
      OLD.file_size,
      OLD.ai_summary,
      OLD.tags,
      OLD.parsed_content,
      OLD.processing_status,
      OLD.uploaded_at
    );
    
    -- Increment version for the new version
    NEW.version = OLD.version + 1;
    NEW.uploaded_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically version documents
DROP TRIGGER IF EXISTS document_version_trigger ON public.user_documents;
CREATE TRIGGER document_version_trigger
BEFORE UPDATE ON public.user_documents
FOR EACH ROW
EXECUTE FUNCTION create_document_version_snapshot();

-- Function to restore a document from a specific version
CREATE OR REPLACE FUNCTION restore_document_version(
  p_document_id UUID,
  p_version_number INTEGER,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version RECORD;
  v_current_doc RECORD;
  v_result JSONB;
BEGIN
  -- Verify user owns the document
  SELECT * INTO v_current_doc
  FROM user_documents
  WHERE id = p_document_id AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Document not found or access denied');
  END IF;
  
  -- Get the version to restore
  SELECT * INTO v_version
  FROM document_versions
  WHERE document_id = p_document_id 
    AND version_number = p_version_number
    AND user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Version not found');
  END IF;
  
  -- Create a snapshot of current version before restoring
  INSERT INTO document_versions (
    document_id,
    user_id,
    version_number,
    file_url,
    file_name,
    file_size,
    ai_summary,
    tags,
    parsed_content,
    processing_status,
    created_at
  ) VALUES (
    v_current_doc.id,
    v_current_doc.user_id,
    v_current_doc.version,
    v_current_doc.file_url,
    v_current_doc.file_name,
    v_current_doc.file_size,
    v_current_doc.ai_summary,
    v_current_doc.tags,
    v_current_doc.parsed_content,
    v_current_doc.processing_status,
    v_current_doc.uploaded_at
  );
  
  -- Restore the version
  UPDATE user_documents
  SET 
    file_url = v_version.file_url,
    file_name = v_version.file_name,
    file_size = v_version.file_size,
    ai_summary = v_version.ai_summary,
    tags = v_version.tags,
    parsed_content = v_version.parsed_content,
    processing_status = v_version.processing_status,
    version = v_current_doc.version + 1,
    uploaded_at = now(),
    version_notes = 'Restored from version ' || p_version_number
  WHERE id = p_document_id;
  
  -- Mark the version record as being the source of a restore
  UPDATE document_versions
  SET restored_from_version = p_version_number
  WHERE document_id = p_document_id 
    AND version_number = v_current_doc.version + 1;
  
  v_result = jsonb_build_object(
    'success', true,
    'restored_version', p_version_number,
    'new_version', v_current_doc.version + 1
  );
  
  RETURN v_result;
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE document_versions IS 'Stores complete version history of user documents, enabling version control and restore functionality';