# Oura Integration - Quick Start Guide

Get your Oura integration up and running in 5 minutes.

## Prerequisites

You need:
1. Oura Developer account with API credentials
2. Supabase CLI installed
3. Access to your Supabase project

---

## Step 1: Get Your Oura API Credentials (2 min)

1. Go to: https://cloud.ouraring.com/oauth/applications
2. Create a new application (or edit existing)
3. Set redirect URI to: `https://predictiv.netlify.app/oauth/callback/oura`
4. Set scopes: `daily` and `personal`
5. Copy your **Client ID** and **Client Secret**

---

## Step 2: Deploy Edge Functions (1 min)

```bash
# Make the script executable (first time only)
chmod +x deploy-oura-functions.sh

# Deploy all functions
./deploy-oura-functions.sh
```

Or deploy manually:
```bash
supabase functions deploy oura-auth-initiate
supabase functions deploy oura-auth
supabase functions deploy fetch-oura-data
supabase functions deploy fetch-oura-auto
```

---

## Step 3: Set Secrets (30 seconds)

```bash
# Replace with your actual credentials
supabase secrets set OURA_CLIENT_ID="your_oura_client_id"
supabase secrets set OURA_CLIENT_SECRET="your_oura_client_secret"
```

---

## Step 4: Apply Database Migration (30 seconds)

```bash
supabase db push
```

---

## Step 5: Test Connection (1 min)

1. Open: https://predictiv.netlify.app/settings
2. Click "Connect Ōura Ring"
3. Authorize access on Oura's page
4. See success message!

---

## Verify Everything Works

### Check tokens were saved:
```sql
SELECT user_id, LEFT(access_token, 20) || '...' as token, expires_at
FROM oura_tokens
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884';
```

### Test data sync:
```javascript
// In browser console on your app
const { data } = await supabase.functions.invoke('fetch-oura-data', {
  body: { user_id: '125ca6dd-715f-4c65-9d83-39ea06978884' }
});
console.log('Synced:', data.entries_synced, 'entries');
```

### Check synced data:
```sql
SELECT date, readiness_score, sleep_score, activity_score
FROM wearable_sessions
WHERE user_id = '125ca6dd-715f-4c65-9d83-39ea06978884'
  AND source = 'oura'
ORDER BY date DESC
LIMIT 7;
```

---

## Done! ✅

Your Oura integration is live. Users can now:
- Connect their Oura Rings
- Sync health data automatically
- View metrics in the dashboard

---

## Need More Details?

- **Full deployment guide**: See `DEPLOYMENT_GUIDE.md`
- **Step-by-step checklist**: See `DEPLOYMENT_CHECKLIST.md`
- **Troubleshooting**: Check Supabase Edge Function logs

---

## Common Issues

**"OURA_CLIENT_ID not configured"**
→ Run: `supabase secrets set OURA_CLIENT_ID="your_id"`

**"Redirect URI mismatch"**
→ Verify Oura portal has: `https://predictiv.netlify.app/oauth/callback/oura`

**"No data syncing"**
→ Check Edge Function logs in Supabase Dashboard

---

**Total Time**: ~5 minutes
**Difficulty**: Easy
**Support**: See `DEPLOYMENT_GUIDE.md` for detailed help
