# Oura Webhook Setup Guide

## Overview

Your application now has comprehensive webhook infrastructure for real-time Oura data updates! This is the **recommended approach** by Oura for consuming their API data.

## Why Webhooks?

Per Oura's official documentation:

> **"Webhooks are the preferred way to consume Oura data. We have not had customers hit rate limits with webhooks properly implemented."**

### Benefits:
- ✅ **Near real-time updates** - Data arrives ~30 seconds after user syncs
- ✅ **No rate limit issues** - Recommended pattern avoids hitting API limits
- ✅ **Efficient** - Only fetch data that changed
- ✅ **Better UX** - App stays updated without manual syncing

---

## Setup Steps

### 1. Configure Environment Variables

Add this secret to your Supabase Edge Function secrets:

```bash
OURA_WEBHOOK_VERIFICATION_TOKEN=<choose-a-strong-random-secret>
```

**How to set secrets:**
1. Go to Supabase Dashboard → Edge Functions
2. Click on Settings → Secrets
3. Add the secret key-value pair
4. The other required secrets (`OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`) should already be configured

### 2. Wait for Oura App Approval

Your application "Predict" is currently **In Review**. Once approved, you'll have access to:
- Production API access
- Webhook configuration in Oura Developer Portal
- Ability to create webhook subscriptions

### 3. Automatic Webhook Setup (Once Approved)

Use the setup function to create all recommended webhooks automatically:

```typescript
// From your application code:
const { data, error } = await supabase.functions.invoke('oura-webhook-setup', {
  body: {
    action: 'setup_all'
  }
});

// This creates webhook subscriptions for:
// - daily_sleep (update)
// - daily_readiness (update)
// - daily_activity (update)
// - daily_spo2 (update)
// - daily_stress (update)
// - daily_resilience (update)
// - sleep (update)
// - workout (update)
// - session (update)
// - tag (update)
```

---

## Available Webhook Management Functions

### List All Subscriptions

```typescript
const { data } = await supabase.functions.invoke('oura-webhook-setup', {
  body: {
    action: 'list'
  }
});
console.log(data.subscriptions);
```

### Create Single Subscription

```typescript
const { data } = await supabase.functions.invoke('oura-webhook-setup', {
  body: {
    action: 'create',
    data_type: 'daily_sleep',
    event_type: 'update'
  }
});
```

### Delete Subscription

```typescript
const { data } = await supabase.functions.invoke('oura-webhook-setup', {
  body: {
    action: 'delete',
    subscription_id: 'subscription-id-here'
  }
});
```

---

## How Webhooks Work

### Flow:

1. **User syncs Oura Ring** via mobile app
2. **Oura sends webhook** (~30 seconds later) to:
   ```
   https://[your-project].supabase.co/functions/v1/oura-webhook
   ```
3. **Your webhook handler** receives notification with:
   - `event_type`: "create", "update", or "delete"
   - `data_type`: "daily_sleep", "daily_activity", etc.
   - `object_id`: ID of the changed data
   - `user_id`: Oura user ID
4. **Handler verifies signature** for security
5. **Handler fetches specific data** using `object_id`
6. **Handler stores data** in your database

### Example Webhook Event:

```json
{
  "event_type": "update",
  "data_type": "daily_sleep",
  "object_id": "abc123",
  "event_time": "2025-11-28T12:00:00Z",
  "user_id": "user-123"
}
```

---

## Security

### HMAC Signature Verification

Every webhook request includes:
- `x-oura-signature`: HMAC-SHA256 signature
- `x-oura-timestamp`: Request timestamp

The webhook handler automatically verifies these using your `OURA_CLIENT_SECRET`.

**Never skip signature verification in production!**

---

## Testing Webhooks

### Local Testing with ngrok:

```bash
# 1. Install ngrok
brew install ngrok  # or download from ngrok.com

# 2. Start your local Supabase functions
supabase functions serve

# 3. Expose to internet
ngrok http 54321

# 4. Update callback URL temporarily to ngrok URL
https://your-ngrok-id.ngrok.io/functions/v1/oura-webhook
```

### Sandbox Testing:

Oura provides sandbox endpoints for testing without real user data:
```
https://api.ouraring.com/v2/sandbox/usercollection/daily_sleep
```

---

## Monitoring

### Check Webhook Logs

Webhook events are logged in the `oura_logs` table:

```sql
SELECT * FROM oura_logs
WHERE status IN ('webhook_received', 'success', 'error')
ORDER BY created_at DESC
LIMIT 50;
```

### Supabase Function Logs

View real-time logs in:
- Supabase Dashboard → Edge Functions → oura-webhook → Logs

---

## Transitioning from Polling to Webhooks

### Current Approach (Polling):
❌ User clicks "Update Now"
❌ Fetches 14 days of data every time
❌ May have stale data between syncs
❌ Risk of hitting rate limits with many users

### Recommended Approach (Webhooks):
✅ **Initial connection:** Fetch historical data (30-90 days)
✅ **Ongoing:** Webhooks notify of changes
✅ **Fetch specific:** Only get updated data via object_id
✅ **Always current:** Data arrives 30s after user syncs

### Migration Steps:

1. **Set up webhooks** (using `setup_all` action)
2. **Keep existing sync** for now (as backup)
3. **Monitor webhook reliability** for 1-2 weeks
4. **Gradually reduce** manual sync prominence in UI
5. **Eventually make** "Update Now" optional/fallback

---

## Available Data Types

Webhooks can be configured for these data types:

### Daily Summaries:
- `daily_sleep` - Sleep score and summary
- `daily_readiness` - Readiness score
- `daily_activity` - Activity and steps
- `daily_spo2` - Blood oxygen levels
- `daily_stress` - Stress measurements
- `daily_resilience` - Resilience scores
- `daily_cardiovascular_age` - Heart age
- `vo2_max` - Cardiovascular fitness

### Detailed Data:
- `sleep` - Detailed sleep periods
- `workout` - Exercise sessions
- `session` - Guided app sessions
- `tag` - User-entered tags
- `heartrate` - Time-series heart rate (5-min intervals)

---

## Enhanced Data Collection

Your application now requests comprehensive OAuth scopes:

```
email personal daily heartrate workout tag session spo2Daily
```

This enables access to:
- ✅ All daily summaries
- ✅ Time-series heart rate data
- ✅ Workout details
- ✅ User tags and sessions
- ✅ SpO2 measurements
- ✅ User profile information

---

## Troubleshooting

### Webhook not receiving events

1. **Check verification:**
   - Ensure `OURA_WEBHOOK_VERIFICATION_TOKEN` is set correctly
   - Webhook URL must be publicly accessible
   - Must respond to GET request during setup

2. **Check signature:**
   - Logs will show "Invalid signature" if verification fails
   - Ensure `OURA_CLIENT_SECRET` matches Developer Portal

3. **Check Oura logs:**
   ```sql
   SELECT * FROM oura_logs WHERE status = 'error' ORDER BY created_at DESC;
   ```

### Webhook timeout

- Handler must respond within **10 seconds**
- Current implementation processes async (good!)
- Check for slow database queries

### Missing data

- User must sync Oura mobile app first
- Some data types (sleep) require app to be opened
- Check if webhook subscriptions are active (`action: 'list'`)

---

## Next Steps

1. ✅ Wait for Oura app approval
2. ✅ Configure `OURA_WEBHOOK_VERIFICATION_TOKEN`
3. ✅ Run `setup_all` action to create subscriptions
4. ✅ Monitor `oura_logs` table for webhook events
5. ✅ Test with your own Oura Ring
6. ✅ Gradually transition users from polling to webhook-based updates

---

## Resources

- [Oura Webhook Documentation](https://cloud.ouraring.com/v2/docs#tag/Webhook-Subscription-Routes)
- [Oura API Best Practices](https://cloud.ouraring.com/v2/docs#section/Best-Practices)
- Your webhook handler: `supabase/functions/oura-webhook/index.ts`
- Your setup function: `supabase/functions/oura-webhook-setup/index.ts`

---

**Note:** This infrastructure is production-ready and follows Oura's official recommendations. Once your app is approved, webhooks will significantly improve your application's performance and user experience!
