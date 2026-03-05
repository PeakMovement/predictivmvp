# Garmin Data Display Fix

## Problem
Garmin data was not displaying on the dashboard even though users had connected their Garmin devices and data was being synced to the database. Only Oura Ring data was showing.

## Root Cause
The frontend code had several Oura-specific references that prevented Garmin data from being displayed:

1. **useWearableMetrics hook**: The refresh function only called `fetch-oura-data` edge function
2. **OuraSyncStatus component**: Only showed Oura connection status and sync times
3. **Console logs and toast messages**: All referenced "Oura" specifically, making it confusing for debugging

## Changes Made

### 1. Updated `src/hooks/useWearableMetrics.ts`
- Modified the `refresh()` function to check for both Oura and Garmin connections
- Now calls both `fetch-oura-data` and `fetch-garmin-data` edge functions based on connected devices
- Updated console logs to say "wearable" instead of "Oura"
- Updated toast messages to be device-agnostic

### 2. Updated `src/components/OuraSyncStatus.tsx`
- Now checks for both Oura and Garmin connections
- Displays "Oura", "Garmin", or "Oura & Garmin" based on what's connected
- Shows the most recent sync time across both devices
- Falls back to "No devices connected" when neither is connected

### 3. Updated `supabase/functions/garmin-auth/index.ts`
- Changed redirect URL from Lovable preview URL to production URL: `https://predictiv.netlify.app`
- This ensures users are redirected to the correct site after Garmin OAuth

## How It Works Now

1. **Data Fetching**: The query already correctly fetches from both sources:
   ```typescript
   .in("source", ["oura", "garmin"])
   ```

2. **Data Refresh**: When user clicks refresh, the system:
   - Checks which devices are connected via `wearable_tokens` table
   - Calls the appropriate edge function(s) for connected devices
   - Syncs data in parallel for efficiency
   - Displays generic success/error messages

3. **Status Display**: The sync status component:
   - Checks both `oura` and `garmin` tokens
   - Shows connected device names
   - Displays the most recent sync time from either source

## Testing
To verify the fix works:

1. Connect a Garmin device via Settings
2. Wait for data to sync (or trigger manual refresh)
3. Check Dashboard - you should see Garmin data displayed
4. Verify the sync status shows "Garmin" or "Oura & Garmin"
5. Console logs should show "Wearable data loaded (garmin)" instead of just Oura

## Database Schema
The `wearable_sessions` table already supports multiple sources via the `source` column which can be:
- `oura`
- `garmin`
- `fitbit`
- `polar`

The query filters correctly to get the latest session from any source, so data from all devices will display properly.
