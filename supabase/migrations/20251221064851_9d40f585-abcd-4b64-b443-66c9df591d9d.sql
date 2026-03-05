-- Create physicians table for the Medical Finder
CREATE TABLE public.physicians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  sub_specialty TEXT,
  location TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  rating NUMERIC(3,2) DEFAULT 0,
  cost_tier TEXT CHECK (cost_tier IN ('low', 'medium', 'high', 'premium')),
  insurance_accepted TEXT[],
  availability TEXT CHECK (availability IN ('immediate', 'same_day', 'next_day', 'within_week', 'within_month')),
  accepting_new_patients BOOLEAN DEFAULT true,
  years_experience INTEGER,
  education TEXT,
  hospital_affiliations TEXT[],
  languages TEXT[] DEFAULT ARRAY['English'],
  telehealth_available BOOLEAN DEFAULT false,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.physicians ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read physicians
CREATE POLICY "Authenticated users can view physicians"
ON public.physicians
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Allow service role full access
CREATE POLICY "Service role full access to physicians"
ON public.physicians
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for common queries
CREATE INDEX idx_physicians_specialty ON public.physicians(specialty);
CREATE INDEX idx_physicians_location ON public.physicians(city, state);
CREATE INDEX idx_physicians_availability ON public.physicians(availability);

-- Insert sample physicians data (based on predictiv-demo CSV patterns)
INSERT INTO public.physicians (name, specialty, sub_specialty, location, city, state, cost_tier, insurance_accepted, availability, accepting_new_patients, years_experience, telehealth_available, rating) VALUES
('Dr. Sarah Chen', 'Internal Medicine', 'Primary Care', 'Downtown Medical Center', 'San Francisco', 'CA', 'medium', ARRAY['Blue Cross', 'Aetna', 'United'], 'same_day', true, 15, true, 4.8),
('Dr. Michael Rodriguez', 'Cardiology', 'Interventional Cardiology', 'Heart Health Institute', 'San Francisco', 'CA', 'high', ARRAY['Blue Cross', 'Cigna', 'Medicare'], 'within_week', true, 20, true, 4.9),
('Dr. Emily Watson', 'Neurology', 'Headache Specialist', 'Bay Area Neurology', 'Oakland', 'CA', 'high', ARRAY['Aetna', 'United', 'Kaiser'], 'within_week', true, 12, true, 4.7),
('Dr. James Park', 'Orthopedics', 'Sports Medicine', 'Sports Medicine Center', 'San Jose', 'CA', 'medium', ARRAY['Blue Cross', 'Aetna', 'Cigna'], 'next_day', true, 18, false, 4.6),
('Dr. Lisa Thompson', 'Psychiatry', 'Anxiety & Depression', 'Mental Wellness Clinic', 'San Francisco', 'CA', 'medium', ARRAY['Blue Cross', 'United', 'Cigna'], 'same_day', true, 10, true, 4.8),
('Dr. Robert Kim', 'Gastroenterology', 'IBD Specialist', 'Digestive Health Center', 'Palo Alto', 'CA', 'high', ARRAY['Aetna', 'Blue Cross', 'Medicare'], 'within_week', true, 22, true, 4.7),
('Dr. Amanda Foster', 'Dermatology', 'Medical Dermatology', 'Skin Health Clinic', 'San Francisco', 'CA', 'medium', ARRAY['United', 'Cigna', 'Aetna'], 'next_day', true, 8, true, 4.5),
('Dr. David Martinez', 'Pulmonology', 'Respiratory Care', 'Lung & Breathing Center', 'Oakland', 'CA', 'high', ARRAY['Blue Cross', 'Medicare', 'Medicaid'], 'same_day', true, 16, true, 4.8),
('Dr. Jennifer Lee', 'Endocrinology', 'Diabetes Management', 'Hormone Health Center', 'San Francisco', 'CA', 'medium', ARRAY['Aetna', 'United', 'Kaiser'], 'within_week', true, 14, true, 4.6),
('Dr. Christopher Brown', 'Rheumatology', 'Autoimmune Disorders', 'Arthritis Care Center', 'San Jose', 'CA', 'high', ARRAY['Blue Cross', 'Cigna', 'Medicare'], 'within_week', true, 19, true, 4.7),
('Dr. Maria Santos', 'Ophthalmology', 'General Eye Care', 'Vision Care Associates', 'San Francisco', 'CA', 'medium', ARRAY['VSP', 'Blue Cross', 'Aetna'], 'next_day', true, 11, false, 4.5),
('Dr. William Chang', 'Urology', 'Men''s Health', 'Bay Urology Group', 'Oakland', 'CA', 'high', ARRAY['Blue Cross', 'United', 'Medicare'], 'within_week', true, 17, true, 4.6),
('Dr. Rachel Green', 'OB/GYN', 'Women''s Health', 'Women''s Health Partners', 'San Francisco', 'CA', 'medium', ARRAY['Aetna', 'Cigna', 'United'], 'same_day', true, 13, true, 4.9),
('Dr. Steven Wright', 'ENT', 'Sinus Specialist', 'Ear Nose Throat Center', 'Palo Alto', 'CA', 'medium', ARRAY['Blue Cross', 'Aetna', 'Kaiser'], 'next_day', true, 15, false, 4.4),
('Dr. Nicole Adams', 'Allergy & Immunology', 'Food Allergies', 'Allergy Care Clinic', 'San Francisco', 'CA', 'medium', ARRAY['United', 'Cigna', 'Blue Cross'], 'same_day', true, 9, true, 4.7),
('Dr. Kevin O''Brien', 'Emergency Medicine', 'Urgent Care', 'CityHealth Urgent Care', 'San Francisco', 'CA', 'low', ARRAY['All Major Insurance'], 'immediate', true, 12, false, 4.3),
('Dr. Patricia Hall', 'Family Medicine', 'General Practice', 'Family Health Center', 'Oakland', 'CA', 'low', ARRAY['Medicaid', 'Medicare', 'Blue Cross'], 'same_day', true, 20, true, 4.6),
('Dr. Andrew Taylor', 'Pain Management', 'Chronic Pain', 'Pain Relief Specialists', 'San Jose', 'CA', 'high', ARRAY['Blue Cross', 'Aetna', 'Cigna'], 'within_week', true, 14, true, 4.5),
('Dr. Michelle Davis', 'Nephrology', 'Kidney Disease', 'Kidney Care Center', 'San Francisco', 'CA', 'high', ARRAY['Medicare', 'Blue Cross', 'United'], 'within_week', true, 16, true, 4.8),
('Dr. Brian Wilson', 'Hematology/Oncology', 'Cancer Care', 'Oncology Associates', 'Palo Alto', 'CA', 'premium', ARRAY['Blue Cross', 'Aetna', 'United'], 'within_week', true, 25, true, 4.9);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_physicians_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER physicians_updated_at
BEFORE UPDATE ON public.physicians
FOR EACH ROW
EXECUTE FUNCTION update_physicians_updated_at();