/*
  # Update oura_tokens view to include scope column

  1. Changes
    - Drop and recreate the oura_tokens view to include the scope column
    - The underlying wearable_tokens table already has the scope column
    
  2. Security
    - Maintain existing RLS policies on the view
*/

-- Drop the existing view
DROP VIEW IF EXISTS oura_tokens;

-- Recreate the view with scope column included
CREATE VIEW oura_tokens AS
SELECT 
  user_id,
  access_token,
  refresh_token,
  expires_at,
  scope,
  created_at
FROM wearable_tokens;