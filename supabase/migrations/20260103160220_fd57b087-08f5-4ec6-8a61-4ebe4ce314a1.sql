-- Add layout preferences column to existing profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS layout_preferences JSONB DEFAULT '{}'::jsonb;

-- Add a comment explaining the column purpose
COMMENT ON COLUMN public.profiles.layout_preferences IS 'Stores UI layout preferences per page including block order, visibility, size, and collapse state. Does not store health data.';

-- Create policy to allow users to read their own layout preferences
CREATE POLICY "Users can read their own layout preferences" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create policy to allow users to update their own layout preferences
CREATE POLICY "Users can update their own layout preferences" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);