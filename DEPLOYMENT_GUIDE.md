# Oura Integration Deployment Guide

## Overview
- **Frontend**: Auto-deploys to Netlify on git push
- **Edge Functions**: Deploy manually to Supabase (one-time setup)
- **Database**: Managed by Supabase

---

## Step 1: Deploy Edge Functions to Supabase

### Prerequisites
- Supabase CLI installed: `npm install -g supabase`
- Logged in to Supabase: `supabase login`
- Linked to your project: `supabase link --project-ref <your-project-ref>`

### Deploy Commands

```bash
# Navigate to project root
cd /path/to/predictiv

# Deploy all Oura-related Edge Functions
supabase functions deploy oura-auth
supabase functions deploy oura-auth-initiate
supabase functions deploy fetch-oura-data
supabase functions deploy fetch-oura-auto

# Verify deployments
supabase functions list
```

**Expected Output:**
```
┌─────────────────────┬──────────┬─────────────────┐
│ NAME                │ STATUS   │ UPDATED AT      │
├─────────────────────┼──────────┼─────────────────┤
│ oura-auth           │ DEPLOYED │ 2025-11-03      │
│ oura-auth-initiate  │ DEPLOYED │ 2025-11-03      │
│ fetch-oura-data     │ DEPLOYED │ 2025-11-03      │
│ fetch-oura-auto     │ DEPLOYED │ 2025-11-03      │
└─────────────────────┴──────────┴─────────────────┘
```

---

## Step 2: Configure Supabase Secrets

Set the required environment variables in Supabase:

```bash
# Set Oura API credentials (REQUIRED)
supabase secrets set OURA_CLIENT_ID="your_oura_client_id_here"
supabase secrets set OURA_CLIENT_SECRET="your_oura_client_secret_here"

# Verify secrets are set
supabase secrets list
```

**Expected Output:**
```
┌────────────────────────┬─────────┐
│ NAME                   │ VALUE   │
├────────────────────────┼─────────┤
│ OURA_CLIENT_ID         │ ***     │
│ OURA_CLIENT_SECRET     │ ***     │
│ SUPABASE_URL           │ ***     │ (auto-provided)
│ SUPABASE_SERVICE_...   │ ***     │ (auto-provided)
└────────────────────────┴─────────┘
```

**Note**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically provided by Supabase. You only need to set the Oura credentials.

---

## Step 3: Apply Database Migration

Apply the new migration for `avg_sleep_score` field:

```bash
# Push database changes
supabase db push

# Or apply specific migration
supabase migration up
```

**Verify the migration:**
```sql
-- Check that avg_sleep_score column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'wearable_summary'
AND column_name = 'avg_sleep_score';
```

**Expected Result:**
```
┌──────────────────┬───────────┐
│ column_name      │ data_type │
├──────────────────┼───────────┤
│ avg_sleep_score  │ numeric   │
└──────────────────┴───────────┘
```

---

## Step 4: Verify Oura Developer Portal Settings

Ensure your Oura application is configured correctly:

1. Go to: https://cloud.ouraring.com/oauth/applications
2. Edit your application
3. Verify settings:

**Redirect URI** (must match exactly):
```
https://predictiv.netlify.app/oauth/callback/oura
```

**Scopes** (must include):
- `daily`
- `personal`

---

## Step 5: Test the OAuth Flow

### 5.1 Initiate Connection

1. Navigate to: https://predictiv.netlify.app/settings
2. Click "Connect Ōura Ring"
3. You should be redirected to Oura's authorization page

### 5.2 Authorize Access

1. Log in to your Oura account
2. Approve the requested permissions
3. You should be redirected back to: `https://predictiv.netlify.app/oauth/callback/oura?code=...`

### 5.3 Verify Success

**Expected behavior:**
- "Connection Successful!" message appears
- Redirect to dashboard after 1.5 seconds

**Check browser console:**
```
[OuraCallback] Authenticated user ID: 125ca6dd-715f-4c65-9d83-39ea06978884
[OuraCallback] Exchanging authorization code for access tokens...
[OuraCallback] Token exchange successful
[OuraCallback] Verifying token storage...
[OuraCallback] Verification result: { hasData: true, hasError: false }
[OuraCallback] Oura Ring connected successfully!
```

### 5.4 Verify Database

```sql
-- Check tokens were saved
SELECT
  user_id,
  LEFT(access_token, 20) || '...' as token_preview,
  expires_at,
  scope,
  fetched_at
FROM oura_tokens
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884';
```

**Expected Result:**
```
┌──────────────────────────────────────┬─────────────────────────┬─────────────────────────┬───────────────┬─────────────────────────┐
│ user_id                              │ token_preview           │ expires_at              │ scope         │ fetched_at              │
├──────────────────────────────────────┼─────────────────────────┼─────────────────────────┼───────────────┼─────────────────────────┤
│ 125ca6dd-715f-4c65-9d83-39ea06978884 │ ABCD1234567890EFGH...   │ 2025-11-04 14:30:00+00  │ daily personal│ 2025-11-03 14:30:00+00  │
└──────────────────────────────────────┴─────────────────────────┴─────────────────────────┴───────────────┴─────────────────────────┘
```

---

## Step 6: Test Data Sync

### 6.1 Manual Data Fetch

Test the `fetch-oura-data` function:

```javascript
// In browser console on your app
const { data, error } = await supabase.functions.invoke('fetch-oura-data', {
  body: {
    user_id: '125ca6dd-715f-4c65-9d83-39ea06978884',
    start_date: '2025-10-27',
    end_date: '2025-11-03'
  }
});

console.log('Sync result:', data);
```

**Expected Response:**
```json
{
  "success": true,
  "entries_synced": 7,
  "start_date": "2025-10-27",
  "end_date": "2025-11-03"
}
```

### 6.2 Verify Data in Database

```sql
-- Check wearable_sessions data
SELECT
  date,
  source,
  readiness_score,
  sleep_score,
  activity_score,
  total_steps,
  resting_hr
FROM wearable_sessions
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884'
  AND source = 'oura'
ORDER BY date DESC
LIMIT 7;
```

**Expected Result:** 7 rows with Oura data

### 6.3 Check Sync Logs

```sql
-- View sync operation logs
SELECT
  status,
  entries_synced,
  error_message,
  created_at
FROM oura_logs
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
```
┌─────────┬────────────────┬───────────────┬─────────────────────────┐
│ status  │ entries_synced │ error_message │ created_at              │
├─────────┼────────────────┼───────────────┼─────────────────────────┤
│ success │ 7              │ NULL          │ 2025-11-03 14:35:00+00  │
└─────────┴────────────────┴───────────────┴─────────────────────────┘
```

---

## Step 7: Set Up Automated Sync (Optional)

### 7.1 Configure Cron Schedule

In Supabase Dashboard:
1. Go to Database → Cron Jobs
2. Create new cron job:

**Name:** `oura-auto-sync`
**Schedule:** `0 */6 * * *` (every 6 hours)
**SQL:**
```sql
SELECT net.http_post(
  url := 'https://your-project-ref.supabase.co/functions/v1/fetch-oura-auto',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
  ),
  body := jsonb_build_object()
);
```

### 7.2 Verify Cron Job

```sql
-- List active cron jobs
SELECT * FROM cron.job WHERE jobname = 'oura-auto-sync';
```

---

## Troubleshooting

### Issue: "OURA_CLIENT_ID not configured"

**Solution:**
```bash
supabase secrets set OURA_CLIENT_ID="your_actual_client_id"
```

### Issue: "Redirect URI mismatch"

**Solution:** Verify Oura Developer Portal redirect URI exactly matches:
```
https://predictiv.netlify.app/oauth/callback/oura
```

### Issue: "Token expired or invalid"

**Solution:** The token refresh should happen automatically. If it doesn't:
1. Check `expires_at` in `oura_tokens` table
2. Manually trigger refresh by calling `fetch-oura-data`
3. If refresh fails, user needs to reconnect: Settings → Disconnect → Reconnect

### Issue: Edge Function not found

**Solution:**
```bash
# Redeploy the function
supabase functions deploy <function-name>

# Check deployment logs
supabase functions deploy <function-name> --debug
```

### Issue: No data syncing

**Check:**
1. Token exists: `SELECT * FROM oura_tokens WHERE user_id = '...'`
2. Token not expired: `SELECT expires_at > NOW() FROM oura_tokens WHERE user_id = '...'`
3. Check logs: `SELECT * FROM oura_logs WHERE user_id = '...' ORDER BY created_at DESC`
4. Verify Oura API scopes include `daily` and `personal`

---

## Monitoring and Maintenance

### Daily Health Checks

```sql
-- Check recent sync success rate
SELECT
  status,
  COUNT(*) as count,
  AVG(entries_synced) as avg_entries
FROM oura_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY status;
```

### Token Expiration Monitoring

```sql
-- Find tokens expiring in next 24 hours
SELECT
  user_id,
  expires_at,
  expires_at - NOW() as time_until_expiry
FROM oura_tokens
WHERE expires_at < NOW() + INTERVAL '24 hours';
```

---

## Summary Checklist

Before going live, verify:

- [ ] All Edge Functions deployed to Supabase
- [ ] `OURA_CLIENT_ID` and `OURA_CLIENT_SECRET` set in Supabase secrets
- [ ] Database migration applied (`avg_sleep_score` column exists)
- [ ] Oura Developer Portal redirect URI matches exactly
- [ ] OAuth flow completes successfully (tokens saved to database)
- [ ] Manual data sync works (`fetch-oura-data` returns data)
- [ ] Data appears in `wearable_sessions` table
- [ ] Sync logs appear in `oura_logs` table
- [ ] Frontend auto-deploys to Netlify on git push

---

## Support Resources

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Netlify Dashboard**: https://app.netlify.com
- **Oura Developer Portal**: https://cloud.ouraring.com/oauth/applications
- **Supabase CLI Docs**: https://supabase.com/docs/guides/cli
- **Edge Function Logs**: Supabase Dashboard → Edge Functions → [function-name] → Logs

---

**Last Updated**: 2025-11-03
**Version**: 34 (Netlify + Supabase Hybrid)
