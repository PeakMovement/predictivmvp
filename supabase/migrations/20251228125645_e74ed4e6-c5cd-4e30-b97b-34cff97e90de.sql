-- Fix the trigger that references non-existent updated_at column
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_medical_finder_sessions_updated_at ON public.medical_finder_sessions;

-- Create or replace the trigger function to use correct column name
CREATE OR REPLACE FUNCTION public.update_medical_finder_sessions_last_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger with correct column reference
CREATE TRIGGER update_medical_finder_sessions_last_updated_at
BEFORE UPDATE ON public.medical_finder_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_medical_finder_sessions_last_updated_at();