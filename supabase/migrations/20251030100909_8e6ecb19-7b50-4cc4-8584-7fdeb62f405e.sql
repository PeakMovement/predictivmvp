-- Trigger function to build health profile after new document insert
CREATE OR REPLACE FUNCTION public.trigger_build_profile_on_new_document()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  -- Call Edge Function to rebuild health profile (document parsing handled separately)
  PERFORM net.http_post(
    url := 'https://ixtwbkikyuexskdgfpfq.functions.supabase.co/build-health-profile',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHdia2lreXVleHNrZGdmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjU4NDgsImV4cCI6MjA3MzMwMTg0OH0.c0w5R1_eKeNytHJgdxUJ2VPkQcnxE1KlyqXPCuJ77Fg'
    ),
    params := '{}'::jsonb,
    body := jsonb_build_object('userId', NEW.user_id),
    timeout_milliseconds := 30000
  );

  RETURN NEW;
END;
$$;

-- Create trigger on user_documents insert
DROP TRIGGER IF EXISTS build_profile_on_new_document ON public.user_documents;
CREATE TRIGGER build_profile_on_new_document
AFTER INSERT ON public.user_documents
FOR EACH ROW
EXECUTE FUNCTION public.trigger_build_profile_on_new_document();