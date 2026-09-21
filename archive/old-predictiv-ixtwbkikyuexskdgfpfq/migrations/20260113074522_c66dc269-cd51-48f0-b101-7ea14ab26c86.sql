-- Add equipment_access column to user_training table
ALTER TABLE public.user_training
ADD COLUMN equipment_access text[] DEFAULT NULL;