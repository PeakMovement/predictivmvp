# Predictiv — Polar Integration Debugging Report
**Date:** 11 April 2026
**For:** Development Team
**Prepared by:** Product Owner (via Claude Code)
**Status:** Blocked — requires dev intervention

---

## Executive Summary

We spent today attempting to resolve the "Connection Failed" error in the Polar AccessLink OAuth integration. Through systematic debugging across the frontend, Supabase edge functions, and Polar Developer Portal, we successfully resolved three out of four root causes. **One blocker remains** that requires further investigation at either the code, configuration, or Polar API level.

**Current status:** Polar authorization flow reaches the token exchange step but fails with `Token exchange failed: 400 {"error":"invalid_request"}` from Polar's API.

---

## Integration Overview

**Flow:** User clicks "Connect Polar" → `polar-auth-initiate` edge function → Polar authorization page → User approves → Polar redirects to `/auth/polar` → Frontend callback → `polar-auth-callback` edge function → Token exchange with Polar → Store tokens in `polar_tokens` table

**Edge functions involved:**
- `supabase/functions/polar-auth-initiate/index.ts`
- `supabase/functions/polar-auth-callback/index.ts`
- `supabase/functions/fetch-polar-exercises/index.ts`
- `supabase/functions/fetch-polar-sleep/index.ts`
- `supabase/functions/fetch-polar-auto/index.ts`

**Frontend:** `src/pages/auth/polar.tsx`

---

## Issues Resolved Today

### 1. Missing Polar Secrets in Supabase Environment

**Symptom:** Every attempt returned `server_config_missing` (500).

**Root cause:** `POLAR_CLIENT_ID` and `POLAR_CLIENT_SECRET` were not configured in Supabase Edge Function secrets.

**Fix applied:** Both secrets added via Supabase Dashboard → Edge Functions → Secrets.

**Status:** ✅ Resolved

---

### 2. Polar Edge Functions Not Registered in config.toml

**Symptom:** Functions may not have been deploying correctly.

**Root cause:** The following functions existed in the codebase but were missing from `supabase/config.toml`:
- `polar-auth-initiate`
- `polar-auth-callback`
- `fetch-polar-exercises`
- `fetch-polar-sleep`
- `fetch-polar-auto`

**Fix applied:** Added all five function blocks to `supabase/config.toml`. Also confirmed correct `verify_jwt` settings:
- `polar-auth-initiate`: `verify_jwt = true`
- `polar-auth-callback`: `verify_jwt = false` (OAuth callback, no JWT present)
- `fetch-polar-*`: `verify_jwt = true`

**Commit:** `d32c24a — Register Polar edge functions in config.toml`

**Status:** ✅ Resolved

---

### 3. polar-auth-callback Returning 401 Unauthorized

**Symptom:** Supabase Invocations page showed every callback request returning `401` before the function code could run. No logs appeared in the Logs tab.

**Root cause:** The deployed version of `polar-auth-callback` had JWT verification enabled, but OAuth callbacks from Polar cannot include a Supabase JWT (Polar has no knowledge of our auth system). Supabase's infrastructure was rejecting the request at the edge before invoking the function.

**Fix applied:** Either `config.toml` redeployment took effect, or JWT verification was manually disabled in the Supabase dashboard. The function now runs correctly on incoming callbacks.

**Status:** ✅ Resolved

---

### 4. React StrictMode Double-Invocation Consuming Auth Code Twice

**Symptom:** After resolving the 401 issue, the first connection attempt returned `invalid_code` from Polar's token endpoint.

**Root cause:** The callback component's `useEffect` was running twice due to React's StrictMode behaviour in development/production builds. The Polar authorization code is single-use — the first token exchange consumed it, the second failed with `invalid_code`.

**Fix applied:** Added a `useRef` guard (`handledRef`) in `src/pages/auth/polar.tsx` to ensure the callback logic only runs once per mount.

**Commit:** `e5fdf6f — Fix Polar callback single-use code bug`

**Code change:**
```typescript
const handledRef = useRef(false);

useEffect(() => {
  if (handledRef.current) return;
  handledRef.current = true;
  // ... callback handling
}, []);
```

**Status:** ✅ Resolved

---

## Current Blocker — Token Exchange Failing

### Symptom

After all above fixes, the Polar callback now reaches the token exchange step but Polar's API rejects it with:

```
Token exchange failed: 400 {"error":"invalid_request"}
```

This appears in the `polar-auth-callback` function logs on every connection attempt.

### Current Token Exchange Request

**File:** `supabase/functions/polar-auth-callback/index.ts` (lines 51-64)

```typescript
const credentials = btoa(`${polarClientId}:${polarClientSecret}`);
const tokenParams = new URLSearchParams({
  grant_type: "authorization_code",
  code: code,
});

const tokenResponse = await fetch("https://polarremote.com/v2/oauth2/token", {
  method: "POST",
  headers: {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
  body: tokenParams.toString(),
});
```

### Suspected Issues (ordered by likelihood)

**1. Missing `Accept` header**

Polar AccessLink API documentation requires:
```
Accept: application/json;charset=UTF-8
```

The current code does not send this header. Polar may reject requests without it as `invalid_request`.

**2. Missing `redirect_uri` in token exchange body**

OAuth 2.0 specification (RFC 6749, Section 4.1.3) requires the `redirect_uri` parameter in the token exchange request if it was included in the authorization request. Polar AccessLink enforces this.

The `polar-auth-initiate` function sends:
```
https://predictiv.netlify.app/auth/polar
```

But the token exchange body does **not** include this. Polar likely rejects the request because of this mismatch.

**3. Wrong Polar token endpoint URL**

Current code uses `https://polarremote.com/v2/oauth2/token`. Polar's documentation may specify a different endpoint depending on the app type (`polaraccesslink.com` vs `polarremote.com`). This needs verification against the current Polar AccessLink API docs.

**4. Polar app configuration mismatch**

If the Polar developer app is registered with a different authorization flow than the one implemented (e.g., PKCE required but not provided), all token exchanges will fail regardless of request format.

---

## Recommended Investigation Path

### Step 1: Fix the token exchange request format (highest probability fix)

Update `supabase/functions/polar-auth-callback/index.ts`:

```typescript
const tokenParams = new URLSearchParams({
  grant_type: "authorization_code",
  code: code,
  redirect_uri: "https://predictiv.netlify.app/auth/polar",
});

const tokenResponse = await fetch("https://polarremote.com/v2/oauth2/token", {
  method: "POST",
  headers: {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json;charset=UTF-8",
  },
  body: tokenParams.toString(),
});
```

### Step 2: Improve error logging

Before redeploying, add verbose logging to capture Polar's full error response:

```typescript
if (!tokenResponse.ok) {
  const errorText = await tokenResponse.text();
  console.error("[polar-auth-callback] Token exchange failed:", {
    status: tokenResponse.status,
    statusText: tokenResponse.statusText,
    body: errorText,
    requestUrl: "https://polarremote.com/v2/oauth2/token",
    requestBody: tokenParams.toString().replace(/code=[^&]+/, "code=REDACTED"),
  });
  return new Response(
    JSON.stringify({ error: "token_exchange_failed", polar_error: errorText }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### Step 3: Verify Polar app configuration

Log into [admin.polaraccesslink.com](https://admin.polaraccesslink.com):
- Confirm the app type (Web/Server-side)
- Confirm the authorization callback URL is exactly: `https://predictiv.netlify.app/auth/polar`
- Confirm data subscriptions are enabled: Exercise data, Daily activity data, Physical information data

### Step 4: Deploy and test

```bash
cd ~/Desktop/predictivmvp
git pull origin main
npx supabase functions deploy polar-auth-callback --project-ref ixtwbkikyuexskdgfpfq
```

Then attempt Polar connection again. Capture the new error from the logs and compare against Polar API documentation.

### Step 5: If still failing — contact Polar support

Polar support contact: [polar.com/en/support/developers](https://www.polar.com/en/support/developers)

Provide them with:
- Your Polar Client ID
- The exact error response from the token endpoint
- The full request payload (with code redacted)

---

## Configuration Reference

### Polar Developer Portal Settings

**Application Web site:** `https://predictiv.netlify.app/`

**Authorization redirect URL:** `https://predictiv.netlify.app/auth/polar`

**Data subscriptions enabled:**
- Exercise data ✓
- Daily activity data ✓
- Physical information data ✓

### Supabase Secrets (Confirmed Set)

- `POLAR_CLIENT_ID` ✓
- `POLAR_CLIENT_SECRET` ✓
- `SUPABASE_URL` ✓
- `SUPABASE_SERVICE_ROLE_KEY` ✓

### Database Tables

- `polar_tokens` — stores access token, polar user ID, member ID, scope per user
- `polar_logs` — audit trail of auth events (success/failure)

---

## Files Modified Today

| File | Change |
|------|--------|
| `supabase/config.toml` | Registered 5 Polar edge functions |
| `src/pages/auth/polar.tsx` | Added `useRef` guard to prevent double invocation |

---

## Git History (Today's Relevant Commits)

```
e5fdf6f — Fix Polar callback single-use code bug
d32c24a — Register Polar edge functions in config.toml
588bf2f — Merge main: Polar config registration
```

---

## Handoff Notes for Developer

**What's working:**
- Frontend routing to `/auth/polar` ✓
- `polar-auth-initiate` generates correct OAuth URL ✓
- User can complete Polar's authorization flow ✓
- Callback reaches `polar-auth-callback` edge function ✓
- React StrictMode double-invocation prevented ✓

**What's not working:**
- Token exchange with `https://polarremote.com/v2/oauth2/token` returns `400 invalid_request`
- No tokens are being stored in `polar_tokens` table
- No data can be fetched from Polar AccessLink until auth completes

**Immediate next action:**
Apply the token exchange fix from "Recommended Investigation Path — Step 1" above. This addresses the two most likely causes (missing `Accept` header and missing `redirect_uri` parameter) simultaneously. If Polar still rejects after that, the improved error logging (Step 2) will reveal the exact cause for further investigation.

**Estimated time to resolution:** 30-60 minutes once dev engages with the fix.

---

## Contact

For questions about this report or the integration context, contact the product owner who has been running the Predictiv app and testing the Polar flow end-to-end.

**End of Report**
