-- Add calendly_url to physicians table
ALTER TABLE public.physicians 
ADD COLUMN IF NOT EXISTS calendly_url text;

-- Add Calendly-related columns to Bookings table
ALTER TABLE public."Bookings"
ADD COLUMN IF NOT EXISTS calendly_event_id text UNIQUE,
ADD COLUMN IF NOT EXISTS appointment_start timestamp with time zone,
ADD COLUMN IF NOT EXISTS appointment_end timestamp with time zone,
ADD COLUMN IF NOT EXISTS patient_name text,
ADD COLUMN IF NOT EXISTS patient_email text,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'native',
ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS notes text;

-- Create index on calendly_event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_calendly_event_id ON public."Bookings" (calendly_event_id) WHERE calendly_event_id IS NOT NULL;

-- Create index on source for filtering
CREATE INDEX IF NOT EXISTS idx_bookings_source ON public."Bookings" (source);

-- Add RLS policy for inserting bookings (for webhook)
CREATE POLICY "Service role can insert bookings"
ON public."Bookings"
FOR INSERT
WITH CHECK (true);

-- Add RLS policy for service role full access
CREATE POLICY "Service role full access to bookings"
ON public."Bookings"
FOR ALL
USING (true)
WITH CHECK (true);