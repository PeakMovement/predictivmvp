# Oura Activity Data Flow - Example API Response

## What the Oura API Returns

When you call `GET https://api.ouraring.com/v2/usercollection/daily_activity?start_date=2025-01-15&end_date=2025-01-15`, the API returns:

```json
{
  "data": [
    {
      "id": "f5bccdce-8d73-4b28-a509-ae6e6bbe7e1d",
      "day": "2025-01-15",
      "score": 85,
      "active_calories": 520,
      "total_calories": 2341,
      "steps": 8452,
      "equivalent_walking_distance": 6420,
      "high_activity_time": 1800,
      "medium_activity_time": 3600,
      "low_activity_time": 7200,
      "sedentary_time": 28800,
      "inactivity_alerts": 2,
      "target_calories": 600,
      "target_meters": 8000
    }
  ],
  "next_token": null
}
```

## What Gets Saved to `wearable_sessions` Table

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "date": "2025-01-15",
  "source": "oura",
  "readiness_score": 80,
  "sleep_score": 89,
  "activity_score": 85,
  "total_steps": 8452,
  "active_calories": 520,
  "total_calories": 2341,
  "resting_hr": 52,
  "hrv_avg": 65,
  "spo2_avg": null,
  "fetched_at": "2025-01-15T10:30:00Z"
}
```

## What Gets Saved to `oura_activity` Table

```json
{
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "oura_id": "f5bccdce-8d73-4b28-a509-ae6e6bbe7e1d",
  "day": "2025-01-15",
  "score": 85,
  "active_calories": 520,
  "total_calories": 2341,
  "steps": 8452,
  "equivalent_walking_distance": 6420,
  "raw_data": {
    "id": "f5bccdce-8d73-4b28-a509-ae6e6bbe7e1d",
    "day": "2025-01-15",
    "score": 85,
    "active_calories": 520,
    "total_calories": 2341,
    "steps": 8452,
    "equivalent_walking_distance": 6420,
    "high_activity_time": 1800,
    "medium_activity_time": 3600,
    "low_activity_time": 7200,
    "sedentary_time": 28800,
    "inactivity_alerts": 2,
    "target_calories": 600,
    "target_meters": 8000
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

## Debug Logs You'll See

```
[fetch-oura-data] Fetching data for user: 123e4567-e89b-12d3-a456-426614174000
[fetch-oura-data] Fetching data from 2025-01-08 to 2025-01-15
[fetch-oura-data] Fetched 7 entries from daily_readiness
[fetch-oura-data] Fetched 7 entries from daily_sleep
[fetch-oura-data] Fetched 7 entries from daily_activity
[fetch-oura-data] Saved activity data for 2025-01-15: 520 active cals, 2341 total cals, 8452 steps
[fetch-oura-data] Successfully processed 7 entries for user 123e4567-e89b-12d3-a456-426614174000
```

## Field Definitions

### From Oura API:
- **active_calories**: Calories burned through physical activity (not including BMR)
- **total_calories**: Total daily calorie expenditure = BMR + active_calories + other
- **steps**: Number of steps taken
- **score**: Activity score (0-100) based on meeting daily targets
- **equivalent_walking_distance**: Distance in meters if all activity were walking

### What Shows in Dashboard:
- **Readiness**: 80 (from readiness_score)
- **Sleep**: 89 (from sleep_score)
- **Activity**: 85 (from activity_score)
- **Steps**: 8,452 (from total_steps)
- **Calories**: 520 (from active_calories) OR 2,341 (from total_calories)

## Changes Made

1. ✅ Added `total_calories` and `equivalent_walking_distance` to `OuraActivityData` interface
2. ✅ Updated `wearable_sessions` insert to save both `active_calories` and `total_calories`
3. ✅ Added new logic to save detailed activity data to `oura_activity` table
4. ✅ Added debug logging to show what calories/steps are being saved
5. ✅ Maintained existing sleep and readiness logic (no changes)
6. ✅ Maintained existing auth and token refresh logic (no changes)

## Testing Steps

1. Call the edge function:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/fetch-oura-data \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "your-user-id"}'
```

2. Check the logs in Supabase Dashboard → Edge Functions → fetch-oura-data → Logs

3. Query the data:
```sql
-- Check wearable_sessions
SELECT date, active_calories, total_calories, total_steps, activity_score
FROM wearable_sessions
WHERE user_id = 'your-user-id'
AND source = 'oura'
ORDER BY date DESC
LIMIT 7;

-- Check oura_activity
SELECT day, active_calories, total_calories, steps, score
FROM oura_activity
WHERE user_id = 'your-user-id'
ORDER BY day DESC
LIMIT 7;
```
