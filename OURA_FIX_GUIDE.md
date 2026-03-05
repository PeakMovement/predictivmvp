# Ōura Connection Fix Guide

## Problem
The error "Tokens were not saved to database. Please check Edge Function secrets (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)" occurs when trying to connect your Ōura Ring.

## Root Cause
The `oura-auth` Edge Function cannot save tokens to the database because it's missing the required Supabase environment variables (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).

## Solution Applied

### 1. **Edge Functions Updated** ✅
Both `oura-auth` and `oura-auth-initiate` functions have been redeployed with:
- Modern Deno runtime (`Deno.serve`)
- Correct npm imports (`npm:@supabase/supabase-js@2`)
- Proper error handling
- Comprehensive logging

### 2. **Diagnostic Page Created** ✅
A new test page is available at `/oura-test` that will:
- Check authentication
- Verify database table access
- Test Edge Function connectivity
- Generate detailed error reports

## Next Steps to Fix the Connection

### Step 1: Verify Supabase Edge Function Secrets

The Edge Functions need these secrets configured in Supabase Dashboard:

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Edge Functions** → **Manage secrets**
3. Verify these secrets exist:
   - `OURA_CLIENT_ID` - Your Ōura Developer Portal Client ID
   - `OURA_CLIENT_SECRET` - Your Ōura Developer Portal Client Secret

4. **IMPORTANT**: The following are auto-provided by Supabase (you don't need to set them):
   - `SUPABASE_URL` - Automatically available
   - `SUPABASE_SERVICE_ROLE_KEY` - Automatically available

### Step 2: Verify Ōura Developer Portal Settings

1. Log into [Ōura Cloud Developer Portal](https://cloud.ouraring.com/oauth/applications)
2. Check your OAuth application settings:
   - **Redirect URI** must be EXACTLY: `https://predictiv.netlify.app/oauth/callback/oura`
   - **Scopes** should include: `daily` and `personal`

### Step 3: Test the Connection

1. Navigate to `/oura-test` in your deployed app
2. Click **"Run Full Diagnostics"**
3. Review all test results:
   - ✅ Green = Working correctly
   - ❌ Red = Issue found (read the error details)

4. If all tests pass, click **"Test OAuth Connection"** to perform a real connection attempt

### Step 4: Check Edge Function Logs

If the connection still fails:

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click on **oura-auth** function
3. View the **Logs** tab
4. Look for recent invocations and error messages

## Common Issues & Fixes

### Issue 1: "OURA_CLIENT_ID is not configured"
**Fix**: Add your Ōura Client ID to Edge Function secrets in Supabase Dashboard

### Issue 2: "Supabase credentials not available in Edge Runtime environment"
**Fix**: This should never happen as these are auto-provided. If it does:
- Redeploy the function (it's already been redeployed with this fix)
- Check Supabase status page for any platform issues

### Issue 3: "Failed to save tokens to database"
**Fix**: Check RLS policies on `oura_tokens` table:
```sql
-- Verify service role has full access (should already exist)
SELECT * FROM pg_policies WHERE tablename = 'oura_tokens';
```

### Issue 4: Redirect URI mismatch
**Fix**: Ensure your Ōura Developer Portal redirect URI is EXACTLY:
```
https://predictiv.netlify.app/oauth/callback/oura
```
(No trailing slash, exact protocol)

## Testing Checklist

- [ ] Verify OURA_CLIENT_ID is set in Supabase Edge Function secrets
- [ ] Verify OURA_CLIENT_SECRET is set in Supabase Edge Function secrets
- [ ] Confirm redirect URI in Ōura Portal matches exactly
- [ ] Run diagnostics at `/oura-test` - all tests pass
- [ ] Attempt OAuth connection from Settings page
- [ ] Check Supabase Edge Function logs for any errors
- [ ] Verify tokens are saved: `SELECT * FROM oura_tokens;`

## Database Verification

After successful connection, verify tokens are saved:

```sql
-- Check if tokens were saved
SELECT
  user_id,
  left(access_token, 10) || '...' as token_preview,
  expires_at,
  created_at,
  updated_at
FROM oura_tokens
ORDER BY created_at DESC;
```

## Files Changed

1. `/supabase/functions/oura-auth/index.ts` - Redeployed with fixes
2. `/supabase/functions/oura-auth-initiate/index.ts` - Redeployed with fixes
3. `/src/pages/OuraConnectionTest.tsx` - NEW diagnostic page
4. `/src/App.tsx` - Added routing for diagnostic page

## Support Resources

- **Ōura API Docs**: https://cloud.ouraring.com/v2/docs
- **Supabase Edge Functions Docs**: https://supabase.com/docs/guides/functions
- **Diagnostic Page**: `/oura-test` (must be logged in)

## Success Criteria

Connection is working when:
1. Clicking "Connect Ōura Ring" in Settings redirects to Ōura OAuth
2. After authorizing, you're redirected back with "Connection Successful"
3. A record appears in `oura_tokens` table with your user_id
4. Subsequent API calls can fetch your Ōura data
