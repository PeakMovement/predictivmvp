/*
  # Create Oura Tokens Table

  1. New Tables
    - `oura_tokens`
      - `user_id` (uuid, primary key) - References auth.users
      - `access_token` (text) - Oura API access token
      - `refresh_token` (text) - Oura API refresh token for token renewal
      - `expires_at` (integer) - Unix timestamp when token expires
      - `created_at` (timestamptz) - When the token was first created
      - `updated_at` (timestamptz) - When the token was last updated

  2. Security
    - Enable RLS on `oura_tokens` table
    - Add policy for users to read their own tokens
    - Add policy for users to insert their own tokens
    - Add policy for users to update their own tokens
    - Add policy for service role to have full access

  3. Indexes
    - Add index on user_id for performance
*/

CREATE TABLE IF NOT EXISTS public.oura_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.oura_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
CREATE POLICY "Users can view their own oura tokens"
  ON public.oura_tokens
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert their own oura tokens"
  ON public.oura_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update their own oura tokens"
  ON public.oura_tokens
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role full access
CREATE POLICY "Service role full access to oura tokens"
  ON public.oura_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_oura_tokens_user_id ON public.oura_tokens(user_id);

-- Add comment for documentation
COMMENT ON TABLE public.oura_tokens IS 'Stores OAuth tokens for Oura Ring API authentication';
