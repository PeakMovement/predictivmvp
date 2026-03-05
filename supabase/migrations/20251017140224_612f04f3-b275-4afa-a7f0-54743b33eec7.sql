-- Enable Realtime updates for yves_profiles table
-- This allows the Developer Baselines Engine to receive instant updates
-- when baseline calculations complete

ALTER PUBLICATION supabase_realtime ADD TABLE public.yves_profiles;