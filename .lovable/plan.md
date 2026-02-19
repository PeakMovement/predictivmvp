
## Why Garmin Data Is Not Showing

### The Real Problem: Garmin API Pull Access Is Not Enabled

The `fetch-garmin-data` edge function is calling the Garmin Wellness API (`https://apis.garmin.com/wellness-api/rest`) and getting back `HTTP 400 — InvalidPullTokenException` on every single request. This error is specific: it means the Garmin Developer Portal application does **not have "Wellness API Pull Access" granted**. Without pull access, the app can only receive data via push (webhooks), not request data on demand.

This is confirmed by the logs — **every single API call fails**, for every user, every day, every endpoint (`/dailies`, `/sleeps`, `/activities`). The tokens themselves are valid (they're fresh JWTs, not expired). The problem is a Garmin portal permission, not a code error.

**Result:** Zero rows exist in `wearable_sessions` with `source = 'garmin'`. No data ever arrives, so nothing displays on the dashboard.

---

### The Secondary Code Bug: Running Distance Ignores the Real Column

Even once pull access is enabled and data starts flowing, `useGarminRunningDistance` calculates distance by estimating from steps using a stride factor instead of reading the `running_distance_km` column that `fetch-garmin-data` already writes to `wearable_sessions`. This means the displayed distance will be inaccurate even after the API starts working.

---

### What Needs to Happen

#### Step 1 — You must enable "Wellness API Pull Access" in the Garmin Developer Portal (not a code change)

This is required before any code fix will help. Without this, the pull sync will keep failing.

Go to **developer.garmin.com** → your application → **API Access** → enable **"Health & Wellness API Pull"**. You may need to submit a request to Garmin for this — it is not automatically granted and requires approval from Garmin's team. The webhook push access (which you already set up) is separate from pull access.

#### Step 2 — Fix `useGarminRunningDistance` to use actual GPS distance

Instead of estimating distance from steps, the hook should read the `running_distance_km` column directly from `wearable_sessions`. This gives accurate GPS-tracked distance for runs and other activities.

**Change in `src/hooks/useGarminRunningDistance.ts`:**
- Query: add `running_distance_km, total_distance_km` to the select
- Calculation: use `running_distance_km` directly (sum across days), with a fallback to the step-based estimate only if the column is null

#### Step 3 — Improve the "no data" state to surface why Garmin data is missing

Currently, when the Garmin sync fails, the UI silently shows nothing with no explanation. We should add a subtle diagnostic message in the Training and Dashboard pages that tells the user when Garmin is connected but no data has synced yet, so they know the device connection is there but data is pending.

---

### Technical Details

| Problem | Root Cause | Fix Required |
|---|---|---|
| Zero Garmin data in database | `InvalidPullTokenException` — pull access not enabled in Garmin Developer Portal | Garmin portal permission (non-code action required from you) |
| Running distance always 0 | `useGarminRunningDistance` estimates from steps instead of reading `running_distance_km` column | Code fix in `src/hooks/useGarminRunningDistance.ts` |
| Today's Activity shows nothing | `training_trends` table has no rows for this user — Garmin sync never populates it | Resolved once Garmin pull access is enabled and sync runs |
| Session log shows nothing | Same as above — `training_trends` is empty for this user | Resolved once Garmin pull access is enabled |

---

### What I Can Fix Now

I can immediately fix the `useGarminRunningDistance` hook to correctly read `running_distance_km` from the database column (accurate GPS distance) rather than estimating from steps.

However, **the data will not appear until you enable Wellness API Pull Access in the Garmin Developer Portal**. That is a Garmin approval process and cannot be fixed in code.

### Action Required From You

1. Log into developer.garmin.com
2. Open your application
3. Navigate to API Access settings
4. Request or enable "Health & Wellness API Pull Access"
5. Once approved, the next automated sync (every 30 minutes) will populate the database and data will appear on screen

If Garmin pull access cannot be approved immediately, the webhook (push) integration is already working — data will arrive whenever Garmin pushes activity events to the endpoint. The push path does not require pull access and is already correctly set up.
