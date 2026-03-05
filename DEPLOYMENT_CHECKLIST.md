# Oura Integration Deployment Checklist

Use this checklist to verify your deployment step-by-step.

## Pre-Deployment

- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Logged into Supabase (`supabase login`)
- [ ] Project linked (`supabase link --project-ref <your-ref>`)
- [ ] Oura Developer account created
- [ ] Oura API application configured at https://cloud.ouraring.com/oauth/applications

## Oura Developer Portal Configuration

- [ ] Redirect URI set to: `https://predictiv.netlify.app/oauth/callback/oura`
- [ ] Scopes include: `daily` and `personal`
- [ ] Client ID copied
- [ ] Client Secret copied (keep secure!)

## Edge Functions Deployment

Run: `./deploy-oura-functions.sh` or deploy manually:

- [ ] `oura-auth-initiate` deployed
- [ ] `oura-auth` deployed
- [ ] `fetch-oura-data` deployed
- [ ] `fetch-oura-auto` deployed

Verify with: `supabase functions list`

## Supabase Secrets Configuration

```bash
supabase secrets set OURA_CLIENT_ID="your_client_id_here"
supabase secrets set OURA_CLIENT_SECRET="your_client_secret_here"
```

- [ ] `OURA_CLIENT_ID` set
- [ ] `OURA_CLIENT_SECRET` set
- [ ] Secrets verified with: `supabase secrets list`

## Database Migration

```bash
supabase db push
```

- [ ] Migration applied successfully
- [ ] `avg_sleep_score` column added to `wearable_summary` table

Verify with:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'wearable_summary' AND column_name = 'avg_sleep_score';
```

## Frontend Deployment

- [ ] Code pushed to GitHub
- [ ] Netlify auto-deployed frontend (check: https://predictiv.netlify.app)
- [ ] No build errors in Netlify logs

## OAuth Flow Testing

### Test 1: Initiate Connection
- [ ] Navigate to https://predictiv.netlify.app/settings
- [ ] Click "Connect Ōura Ring"
- [ ] Redirected to Oura authorization page

### Test 2: Authorization
- [ ] Log in to Oura account
- [ ] Approve permissions
- [ ] Redirected back to callback page

### Test 3: Token Storage
- [ ] See "Connection Successful!" message
- [ ] Redirected to dashboard after 1.5 seconds
- [ ] No errors in browser console

### Test 4: Database Verification
Run this query:
```sql
SELECT user_id, LEFT(access_token, 20) || '...' as token, expires_at, scope
FROM oura_tokens
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884';
```

- [ ] Token record exists
- [ ] `access_token` is populated (shows truncated preview)
- [ ] `expires_at` is in the future
- [ ] `scope` shows "daily personal"

## Data Sync Testing

### Test 5: Manual Data Fetch
In browser console on your app:
```javascript
const { data, error } = await supabase.functions.invoke('fetch-oura-data', {
  body: {
    user_id: '125ca6dd-715f-4c65-9d83-39ea06978884',
    start_date: '2025-10-27',
    end_date: '2025-11-03'
  }
});
console.log('Result:', data);
```

- [ ] Function returns `success: true`
- [ ] `entries_synced` > 0
- [ ] No error in response

### Test 6: Verify Synced Data
```sql
SELECT date, source, readiness_score, sleep_score, activity_score, total_steps
FROM wearable_sessions
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884'
  AND source = 'oura'
ORDER BY date DESC
LIMIT 7;
```

- [ ] At least 1 row returned
- [ ] `source` = 'oura'
- [ ] Scores are populated (readiness, sleep, activity)
- [ ] Steps and other metrics present

### Test 7: Check Sync Logs
```sql
SELECT status, entries_synced, error_message, created_at
FROM oura_logs
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884'
ORDER BY created_at DESC
LIMIT 3;
```

- [ ] Log entry exists
- [ ] `status` = 'success'
- [ ] `entries_synced` matches expected count
- [ ] `error_message` is NULL

## Edge Function Logs Review

In Supabase Dashboard → Edge Functions → [function-name] → Logs:

### oura-auth logs should show:
- [ ] `[oura-auth] Exchanging code for user: ...`
- [ ] `[oura-auth] Successfully received tokens from Oura`
- [ ] `[oura-auth] Saving tokens to database...`
- [ ] `[oura-auth] Successfully saved tokens to database`

### fetch-oura-data logs should show:
- [ ] `[fetch-oura-data] Fetching data for user: ...`
- [ ] `[fetch-oura-data] Fetching data from YYYY-MM-DD to YYYY-MM-DD`
- [ ] `[fetch-oura-data] Fetched X entries from daily_readiness`
- [ ] `[fetch-oura-data] Fetched X entries from daily_sleep`
- [ ] `[fetch-oura-data] Fetched X entries from daily_activity`
- [ ] `[fetch-oura-data] Successfully processed X entries`

## Frontend Verification

- [ ] Dashboard shows Oura data
- [ ] Health metrics cards display Oura Ring values
- [ ] Last sync time displayed correctly
- [ ] Connection status shows "Connected"

## Optional: Automated Sync Setup

If setting up cron job for automatic syncing:

- [ ] Cron job created in Supabase Dashboard
- [ ] Schedule configured (e.g., every 6 hours)
- [ ] Test cron job manually
- [ ] Verify cron job runs successfully

---

## Troubleshooting Reference

If any step fails, refer to:
- `DEPLOYMENT_GUIDE.md` - Detailed troubleshooting section
- Supabase Edge Function logs
- Browser console for frontend errors
- Netlify deploy logs

---

## Success Criteria

All items checked = Deployment successful! ✅

Your users can now:
1. Connect their Oura Rings via Settings
2. Automatically sync health data
3. View Oura metrics in the dashboard
4. Receive insights based on Oura data

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Project Version**: 34
**Notes**: _____________________________________________
