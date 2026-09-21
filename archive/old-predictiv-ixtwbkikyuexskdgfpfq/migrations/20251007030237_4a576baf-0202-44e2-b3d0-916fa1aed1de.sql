-- Create storage bucket for CSV uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('predictiv_data', 'predictiv_data', false);

-- Create csv_uploads table
CREATE TABLE public.csv_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on csv_uploads
ALTER TABLE public.csv_uploads ENABLE ROW LEVEL SECURITY;

-- Users can view their own uploads
CREATE POLICY "Users can view their own uploads"
ON public.csv_uploads
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own uploads
CREATE POLICY "Users can insert their own uploads"
ON public.csv_uploads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Storage policies for predictiv_data bucket
CREATE POLICY "Users can upload their own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'predictiv_data' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'predictiv_data' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'predictiv_data' AND
  auth.uid()::text = (storage.foldername(name))[1]
);