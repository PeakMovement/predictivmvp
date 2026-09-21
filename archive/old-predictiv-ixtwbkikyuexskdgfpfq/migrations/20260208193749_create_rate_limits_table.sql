/*
  # Create Rate Limits Table

  1. New Tables
    - `rate_limits`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Format: "prefix:user_id"
      - `count` (integer) - Number of requests in current window
      - `reset_at` (timestamptz) - When the count resets
      - `updated_at` (timestamptz) - Last request timestamp
      - `created_at` (timestamptz) - First request timestamp

  2. Security
    - Enable RLS on `rate_limits` table
    - Add policy for service role to manage rate limits
    - Users cannot directly access rate limits

  3. Indexes
    - Index on `key` for fast lookups
    - Index on `reset_at` for cleanup operations

  4. Notes
    - Used by edge functions to prevent API abuse
    - Automatically cleaned up via TTL policy
*/

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  count integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Service role can manage all rate limits
CREATE POLICY "Service role can manage rate limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create function to clean up expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE reset_at < now() - interval '1 hour';
END;
$$;

-- Create comment
COMMENT ON TABLE rate_limits IS 'Rate limiting records for API abuse prevention';
COMMENT ON COLUMN rate_limits.key IS 'Format: "prefix:user_id" (e.g., "ai_chat:123")';
COMMENT ON COLUMN rate_limits.count IS 'Number of requests in current time window';
COMMENT ON COLUMN rate_limits.reset_at IS 'When the rate limit counter resets';
