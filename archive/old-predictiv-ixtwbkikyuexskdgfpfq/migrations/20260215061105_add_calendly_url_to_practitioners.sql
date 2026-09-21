/*
  # Add Calendly URL to Healthcare Practitioners
  
  1. Changes
    - Add `calendly_url` column to `healthcare_practitioners` table
    - This enables practitioners to use Calendly for booking integration
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'healthcare_practitioners' 
    AND column_name = 'calendly_url'
  ) THEN
    ALTER TABLE public.healthcare_practitioners 
    ADD COLUMN calendly_url text;
  END IF;
END $$;
