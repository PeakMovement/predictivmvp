/*
  # Add Service Role Policy to insight_history
  
  1. Security Updates
    - Add service role policy for full access to insight_history table
    - This allows Netlify functions using service role key to insert chat records
  
  Notes:
    - Service role has elevated privileges and should only be used server-side
    - This is required for the yves-chat Netlify function to save conversations
*/

DROP POLICY IF EXISTS "Service role full access to insight_history" ON insight_history;
CREATE POLICY "Service role full access to insight_history"
ON insight_history FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
