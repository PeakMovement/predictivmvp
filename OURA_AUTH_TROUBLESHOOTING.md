# Oura OAuth Connection Issue - Troubleshooting Guide

## Problem Summary

The Oura Ring OAuth callback is failing with the error:

```
Connection Failed
Tokens were not saved to database. Please check Edge Function secrets
(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) in Supabase Dashboard.
```

## Root Cause

The `oura-auth` Edge Function cannot access the required Supabase environment variables to save OAuth tokens to the database. This prevents the authentication flow from completing successfully.

## Solution Steps

### Step 1: Verify Supabase Project Settings

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your Predictiv project
3. Navigate to **Settings** → **API**
4. Verify these values exist:
   - **Project URL** (should be `https://YOUR_PROJECT_ID.supabase.co`)
   - **service_role key** (should be a long JWT token starting with `eyJ...`)

### Step 2: Redeploy the Edge Function

The environment variables (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`) are **automatically injected** by Supabase into Edge Functions at runtime. If they're missing, redeploying usually fixes it.

**Option A: Via Supabase Dashboard**

1. Navigate to **Edge Functions** in your Supabase Dashboard
2. Find the `oura-auth` function
3. Click the **...** menu → **Redeploy**
4. Wait for deployment to complete

**Option B: Via Supabase CLI** (if you have CLI access)

```bash
# Make sure you're in the project directory
cd /path/to/predictiv

# Deploy the function
supabase functions deploy oura-auth
```

### Step 3: Verify Environment Variables (Advanced)

If redeployment doesn't work, you can manually add the environment variables:

1. In Supabase Dashboard → **Edge Functions**
2. Click on `oura-auth` function
3. Go to **Settings** tab
4. Add these secrets:
   - `SUPABASE_URL`: Your project URL (from Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service_role key (from Settings → API)

⚠️ **Important**: Keep the service_role key SECRET. Never expose it in client-side code.

### Step 4: Verify Oura Credentials

While you're in the Edge Function settings, also verify these Oura-specific variables exist:

- `OURA_CLIENT_ID`: Your Oura API client ID
- `OURA_CLIENT_SECRET`: Your Oura API client secret

These should be configured when you set up the Oura integration.

### Step 5: Test the Connection

1. Go to your Predictiv app
2. Navigate to Settings → Wearables
3. Click "Connect Oura Ring"
4. Complete the OAuth flow
5. You should be redirected back with a success message

### Step 6: Check Logs for Diagnostics

If the issue persists, check the Edge Function logs:

1. Supabase Dashboard → **Edge Functions** → `oura-auth`
2. Click **Logs** tab
3. Look for error messages
4. The improved logging will show:
   ```
   [oura-auth] Environment check:
     SUPABASE_URL present: true/false
     SUPABASE_URL value: https://...
     SUPABASE_SERVICE_ROLE_KEY present: true/false
   ```

## Common Issues & Solutions

### Issue 1: "SUPABASE_URL is MISSING"

**Cause**: Environment variable not injected into Edge Function runtime

**Solution**:
1. Redeploy the function (Step 2 above)
2. If that doesn't work, manually add the variable (Step 3 above)

### Issue 2: "Database upsert error"

**Cause**: Usually a database permission issue or RLS policy blocking the insert

**Solution**:
1. Check that RLS policies allow service role to insert:
   ```sql
   -- Verify this policy exists in your database
   CREATE POLICY "Service role manages all" ON oura_tokens
     FOR ALL TO service_role
     USING (true)
     WITH CHECK (true);
   ```

2. Run this in SQL Editor to add the policy if missing:
   ```sql
   ALTER TABLE oura_tokens ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Service role manages all" ON oura_tokens
     FOR ALL TO service_role
     USING (true)
     WITH CHECK (true);
   ```

### Issue 3: "Incomplete token data from Oura API"

**Cause**: Oura API didn't return access_token or refresh_token

**Solution**:
1. Verify your Oura credentials are correct
2. Check that your OAuth redirect URI matches exactly:
   - Must be: `https://predictiv.netlify.app/oauth/callback/oura`
   - Set in Oura Developer Portal: https://cloud.ouraring.com/oauth/applications
3. Make sure your Oura app is not in sandbox mode (or use sandbox credentials)

### Issue 4: "User not authenticated"

**Cause**: User's Supabase session expired or invalid

**Solution**:
1. Log out and log back into Predictiv
2. Try the Oura connection flow again

## Technical Details

### What the Code Does

1. User clicks "Connect Oura Ring" → Redirected to Oura OAuth page
2. User authorizes → Oura redirects back with `code` parameter
3. `OuraCallback.tsx` calls `oura-auth` Edge Function with the code
4. Edge Function exchanges code for tokens with Oura API
5. Edge Function saves tokens to `oura_tokens` table
6. User is redirected to dashboard

### Database Schema

```sql
CREATE TABLE oura_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,  -- Unix timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Edge Function Environment Variables

**Automatically Provided by Supabase:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role JWT token
- `SUPABASE_ANON_KEY` - Anonymous public key (not used in this function)

**Manually Configured:**
- `OURA_CLIENT_ID` - From Oura Developer Portal
- `OURA_CLIENT_SECRET` - From Oura Developer Portal

## Code Changes Made

I've improved the `oura-auth` Edge Function with:

1. **Better error messages**: Clearly explains what's missing
2. **Detailed logging**: Shows exactly which variables are present/missing
3. **Validation**: Checks for required data before attempting database operations
4. **Explicit error handling**: Catches and reports specific failure points

## Next Steps After Fix

Once the connection works:

1. Verify tokens were saved:
   ```sql
   SELECT user_id, expires_at, created_at
   FROM oura_tokens
   WHERE user_id = 'your-user-id';
   ```

2. Test automatic data sync:
   - Wait for hourly cron job, or
   - Manually trigger: Settings → "Sync Now"

3. Check that data appears in Dashboard:
   - Readiness Score
   - Sleep Score
   - Activity metrics

## Support

If you're still experiencing issues after following these steps:

1. Check the Edge Function logs (see Step 6)
2. Check browser console for client-side errors (F12 → Console tab)
3. Verify all environment variables are set correctly
4. Try the OAuth flow in an incognito window (rules out cache issues)

---

**Last Updated**: 2025-11-02
**Related Files**:
- `supabase/functions/oura-auth/index.ts` - Edge Function
- `src/pages/OuraCallback.tsx` - OAuth callback handler
- `supabase/migrations/20251031155611_create_oura_tokens_table.sql` - Database schema
