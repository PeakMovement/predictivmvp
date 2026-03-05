-- Fix public.run_full_pipeline to correctly invoke edge functions with headers and JSON body
CREATE OR REPLACE FUNCTION public.run_full_pipeline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $function$
DECLARE
  _user_id uuid := NEW.user_id;
  _headers jsonb := jsonb_build_object(
    'Content-Type','application/json',
    'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4dHdia2lreXVleHNrZGdmcGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MjU4NDgsImV4cCI6MjA3MzMwMTg0OH0.c0w5R1_eKeNytHJgdxUJ2VPkQcnxE1KlyqXPCuJ77Fg'
  );
BEGIN
  IF _user_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://ixtwbkikyuexskdgfpfq.functions.supabase.co/calc-trends',
    headers := _headers,
    params := '{}'::jsonb,
    body := jsonb_build_object('user_id', _user_id),
    timeout_milliseconds := 30000
  );

  PERFORM net.http_post(
    url := 'https://ixtwbkikyuexskdgfpfq.functions.supabase.co/calculate-baseline',
    headers := _headers,
    params := '{}'::jsonb,
    body := jsonb_build_object('user_id', _user_id),
    timeout_milliseconds := 30000
  );

  PERFORM net.http_post(
    url := 'https://ixtwbkikyuexskdgfpfq.functions.supabase.co/calculate-deviation',
    headers := _headers,
    params := '{}'::jsonb,
    body := jsonb_build_object('user_id', _user_id),
    timeout_milliseconds := 30000
  );

  RETURN NEW;
END;
$function$;