-- Add tone_preference column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tone_preference text DEFAULT 'balanced' 
CHECK (tone_preference IN ('coach', 'warm', 'supportive', 'strategic', 'balanced'));