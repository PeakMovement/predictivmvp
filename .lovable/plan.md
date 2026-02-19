
## Investigation Summary

### Root Cause #1 — Broken Verification Links for New Users

In `src/pages/Register.tsx`, the `emailRedirectTo` is set to:
```typescript
emailRedirectTo: `${window.location.origin}/`
```

During development, `window.location.origin` is `http://localhost:3000`. This gets embedded in the verification email Supabase sends out. When a user clicks that link from their email client, it tries to reach `localhost:3000` on their own machine — which is a dead end. That is why users see "Email link is invalid or has expired" in the auth logs. The fix is to hardcode the production preview URL so verification emails always point to the live app.

### Root Cause #2 — `matthewhow94@gmail.com` Cannot Log In

The account is **fully confirmed** (`email_confirmed_at` is set). The issue is that the user is trying to log in with a password (`Retireby40*`) that was never set — the original signup may have had a different password. The fix is to update the password via Supabase's admin API using a SQL migration that calls `auth.admin` functions.

### What Is Working
- The account `matthewhow94@gmail.com` exists and is email-confirmed
- The `user_profiles` record exists for that user
- The login form itself is functional

---

## Plan

### Step 1 — Set Password for `matthewhow94@gmail.com`

Run a database migration that uses Supabase's built-in `auth.users` update to set the password hash for the existing confirmed account. This requires calling the internal admin function via SQL:

```sql
UPDATE auth.users
SET encrypted_password = crypt('Retireby40*', gen_salt('bf'))
WHERE email = 'matthewhow94@gmail.com';
```

This will allow the user to immediately log in with the provided password.

### Step 2 — Fix `emailRedirectTo` in `Register.tsx`

Change the redirect URL from the dynamic `window.location.origin` to the fixed production preview URL so that all future confirmation emails point to the live app:

```typescript
// Before (broken — embeds localhost in emails during dev):
emailRedirectTo: `${window.location.origin}/`

// After (correct — always points to live app):
emailRedirectTo: `https://id-preview--496b78dd-5429-4d22-8cdf-157ebd1425c9.lovable.app/`
```

This ensures that when Supabase sends a verification email to any new user, the link in that email resolves to the running application and completes the token exchange correctly.

### Step 3 — Verify the Full Flow After Changes

After the migration runs and the code change is saved:
- Confirm `matthewhow94@gmail.com` can log in with `Retireby40*`
- Register a test new user and confirm the verification email link now resolves correctly

---

## Technical Details

| Issue | Location | Fix |
|---|---|---|
| Password not set for existing user | `auth.users` table | SQL UPDATE to set encrypted password |
| Verification links point to localhost | `src/pages/Register.tsx` line ~55 | Hardcode production URL in `emailRedirectTo` |
