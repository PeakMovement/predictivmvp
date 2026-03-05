-- Rename Fitbit tables to neutral wearable versions

-- Rename fitbit_tokens to wearable_tokens
ALTER TABLE public.fitbit_tokens RENAME TO wearable_tokens;

-- Rename fitbit_auto_data to wearable_auto_data  
ALTER TABLE public.fitbit_auto_data RENAME TO wearable_auto_data;

-- Update column names in wearable_auto_data to be more generic
ALTER TABLE public.wearable_auto_data RENAME COLUMN activity_data TO activity;
ALTER TABLE public.wearable_auto_data RENAME COLUMN sleep_data TO sleep;

-- Rename fitbit_trends to training_trends
ALTER TABLE public.fitbit_trends RENAME TO training_trends;