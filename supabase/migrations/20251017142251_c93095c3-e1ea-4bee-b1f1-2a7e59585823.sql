-- Add public read RLS policy for yves_profiles for demo/dev purposes
CREATE POLICY "Allow public read for yves_profiles"
ON yves_profiles FOR SELECT
USING (true);