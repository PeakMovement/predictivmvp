-- Add Fitbit connection fields to users table
ALTER TABLE public.users 
ADD COLUMN fitbit_connected boolean DEFAULT false,
ADD COLUMN fitbit_user_id text,
ADD COLUMN connected_at timestamp with time zone;