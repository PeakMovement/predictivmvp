-- Create helper function to strip tokens from fitbit_auto_data activity JSONB
CREATE OR REPLACE FUNCTION strip_tokens_from_activity(u_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE fitbit_auto_data 
  SET activity = activity - 'tokens'
  WHERE user_id = u_id AND activity ? 'tokens';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;