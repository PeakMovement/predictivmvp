# Ōura Connection - Quick Fix Checklist ⚡

## 🔴 **MUST DO FIRST** - Configure Secrets

### 1. Supabase Dashboard
Go to: **Edge Functions → Manage secrets**

Add these two secrets:
```bash
OURA_CLIENT_ID = <your-oura-client-id>
OURA_CLIENT_SECRET = <your-oura-client-secret>
```

❌ **DO NOT ADD**: `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

### 2. Ōura Developer Portal
Go to: https://cloud.ouraring.com/oauth/applications

Set Redirect URI to EXACTLY:
```
https://predictiv.netlify.app/oauth/callback/oura
```

Set Scopes to: `daily personal`

---

## ✅ **Test Before Connecting**

### Run Diagnostics Page
1. Navigate to: `/oura-test`
2. Click **"Run Full Diagnostics"**
3. Verify all tests show ✅ green

**If you see ❌ red errors**:
- Check which test failed
- Read the error message
- Fix the issue (usually missing secrets)
- Run diagnostics again

---

## 🚀 **Connect Your Ōura Ring**

1. Go to **Settings** page
2. Click **"Connect Ōura Ring"**
3. Authorize on Ōura's page
4. You'll be redirected back
5. Should see **"Connection Successful!"**

---

## 🐛 **If Connection Fails**

### Check Browser Console
Press F12 → Console tab
Look for error messages starting with `[OuraCallback]`

### Check Supabase Logs
Supabase Dashboard → Edge Functions → oura-auth → Logs

### Common Issues

**"Missing OURA_CLIENT_ID"**
→ Add secret in Supabase Dashboard

**"redirect_uri mismatch"**
→ Fix redirect URI in Ōura Portal (must match exactly)

**"Tokens not saved"**
→ Check Edge Function logs for database errors

---

## ✨ **Verify Success**

Run this SQL in Supabase SQL Editor:
```sql
SELECT
  user_id,
  left(access_token, 20) || '...' as token,
  to_timestamp(expires_at) as expires,
  created_at
FROM oura_tokens
WHERE user_id = auth.uid();
```

You should see your token! 🎉

---

## 📋 **Critical Files Updated**

✅ `oura-auth` Edge Function (redeployed)
✅ `oura-auth-initiate` Edge Function (redeployed)
✅ `oura-auth-test` Edge Function (NEW - for diagnostics)
✅ `OuraCallback.tsx` (fixed parameter bug)
✅ `OuraConnectionTest.tsx` (NEW - diagnostic page at /oura-test)

---

## 🔗 **Quick Links**

- Diagnostic Page: `/oura-test`
- Ōura Developer Portal: https://cloud.ouraring.com/oauth/applications
- Supabase Dashboard: https://supabase.com/dashboard
- Full Documentation: See `OURA_CONNECTION_COMPLETE_FIX.md`

---

**The connection WILL work once you:**
1. ✅ Add the two secrets in Supabase
2. ✅ Set correct redirect URI in Ōura Portal
3. ✅ Run diagnostics and verify all tests pass

Then just click "Connect Ōura Ring" and you're done! 🎊
