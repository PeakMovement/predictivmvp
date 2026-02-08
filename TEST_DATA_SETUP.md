# Test Data Setup Guide
## Populate Database for Testing Groups 4-7

If you don't have enough real wearable data, use these scripts to create test data.

---

## Prerequisites

1. **User Account**: You must be logged in
2. **Supabase Access**: Access to Supabase SQL Editor
3. **User ID**: Know your user ID (get from auth.users table)

---

## Get Your User ID

```sql
-- Run this while logged in
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';
```

Copy your user ID for use in scripts below.

---

## 1. Create Test Wearable Data

### Create Daily Summaries (for patterns)

```sql
-- Replace USER_ID with your actual user ID
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- REPLACE THIS
  v_date date;
BEGIN
  -- Create 14 days of wearable data
  FOR i IN 0..13 LOOP
    v_date := CURRENT_DATE - i;

    INSERT INTO wearable_daily_summary (
      user_id,
      date,
      source,
      total_steps,
      active_calories,
      resting_heart_rate,
      hrv_avg,
      sleep_score,
      readiness_score,
      activity_score,
      total_sleep_minutes,
      deep_sleep_minutes,
      rem_sleep_minutes,
      light_sleep_minutes
    ) VALUES (
      v_user_id,
      v_date,
      'oura',
      8000 + (random() * 4000)::int,
      300 + (random() * 200)::int,
      55 + (random() * 15)::int,
      45 + (random() * 30)::int,
      70 + (random() * 25)::int,
      75 + (random() * 20)::int,
      80 + (random() * 15)::int,
      420 + (random() * 60)::int,
      90 + (random() * 30)::int,
      80 + (random() * 40)::int,
      200 + (random() * 60)::int
    )
    ON CONFLICT (user_id, date, source) DO NOTHING;
  END LOOP;
END $$;
```

---

## 2. Create Test Patterns

### Create Context Patterns

```sql
-- Replace USER_ID with your actual user ID
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- REPLACE THIS
BEGIN
  -- Pattern 1: Sleep consistency
  INSERT INTO user_context_enhanced (
    user_id,
    pattern_type,
    context_summary,
    confidence_score,
    source_data_count
  ) VALUES (
    v_user_id,
    'sleep_pattern',
    'You tend to get better sleep on days when you exercise in the morning rather than evening',
    0.85,
    12
  );

  -- Pattern 2: Recovery insight
  INSERT INTO user_context_enhanced (
    user_id,
    pattern_type,
    context_summary,
    confidence_score,
    source_data_count
  ) VALUES (
    v_user_id,
    'recovery_pattern',
    'Your HRV typically drops 2-3 days after high-intensity training sessions',
    0.72,
    8
  );

  -- Pattern 3: Activity behavior
  INSERT INTO user_context_enhanced (
    user_id,
    pattern_type,
    context_summary,
    confidence_score,
    source_data_count
  ) VALUES (
    v_user_id,
    'activity_pattern',
    'You are most active on Tuesdays and Thursdays, averaging 30% more steps than other days',
    0.91,
    15
  );

  -- Pattern 4: Low confidence pattern
  INSERT INTO user_context_enhanced (
    user_id,
    pattern_type,
    context_summary,
    confidence_score,
    source_data_count
  ) VALUES (
    v_user_id,
    'behavior_pattern',
    'Possible connection between caffeine intake timing and sleep quality',
    0.45,
    5
  );
END $$;
```

---

## 3. Create Daily Briefings (for Weekly Planner)

```sql
-- Replace USER_ID with your actual user ID
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- REPLACE THIS
  v_date date;
BEGIN
  -- Create 7 days of briefings for current week
  FOR i IN 0..6 LOOP
    v_date := date_trunc('week', CURRENT_DATE)::date + i;

    INSERT INTO daily_briefings (
      user_id,
      briefing_date,
      primary_insight,
      secondary_insight,
      recommendation,
      focus_area,
      tone
    ) VALUES (
      v_user_id,
      v_date,
      CASE
        WHEN i = 0 THEN 'Start your week strong with good recovery from the weekend'
        WHEN i = 1 THEN 'Energy levels are optimal for challenging workouts'
        WHEN i = 2 THEN 'Consider a lighter day - recovery metrics trending down'
        WHEN i = 3 THEN 'Midweek recovery day showing good adaptation'
        WHEN i = 4 THEN 'HRV trending up, good time for interval training'
        WHEN i = 5 THEN 'Week fatigue building, focus on sleep quality'
        ELSE 'Wind down the week with active recovery'
      END,
      'Sleep quality is 15% above your baseline',
      CASE
        WHEN i = 0 THEN 'Prioritize morning movement to boost energy'
        WHEN i = 1 THEN 'Schedule your hardest workout today'
        WHEN i = 2 THEN 'Yoga or stretching would be ideal'
        WHEN i = 3 THEN 'Stay consistent with sleep schedule'
        WHEN i = 4 THEN 'Push hard but allow recovery between sets'
        WHEN i = 5 THEN 'Focus on sleep prep after 8pm'
        ELSE 'Light activity and meal prep for next week'
      END,
      CASE
        WHEN i IN (0,1,4) THEN 'performance'
        WHEN i IN (2,5,6) THEN 'recovery'
        ELSE 'balance'
      END,
      CASE
        WHEN i IN (0,4) THEN 'coach'
        WHEN i IN (1,2,5) THEN 'warm'
        ELSE 'strategic'
      END
    )
    ON CONFLICT (user_id, briefing_date) DO NOTHING;
  END LOOP;
END $$;
```

---

## 4. Create Test Google Calendar Events

```sql
-- Replace USER_ID with your actual user ID
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- REPLACE THIS
  v_connection_id uuid;
BEGIN
  -- First create a calendar connection
  INSERT INTO google_calendar_connections (
    user_id,
    google_calendar_id,
    calendar_name,
    access_token,
    refresh_token,
    token_expires_at
  ) VALUES (
    v_user_id,
    'test-calendar@test.com',
    'Test Calendar',
    'test-token',
    'test-refresh',
    NOW() + INTERVAL '1 hour'
  )
  RETURNING id INTO v_connection_id;

  -- Create today's events
  INSERT INTO google_calendar_events (
    user_id,
    connection_id,
    event_id,
    summary,
    description,
    start_time,
    end_time,
    location
  ) VALUES
  (
    v_user_id,
    v_connection_id,
    'event-1',
    'Morning Workout',
    'High intensity interval training',
    CURRENT_DATE + TIME '07:00:00',
    CURRENT_DATE + TIME '08:00:00',
    'Home Gym'
  ),
  (
    v_user_id,
    v_connection_id,
    'event-2',
    'Team Meeting',
    'Weekly sync with the team',
    CURRENT_DATE + TIME '10:00:00',
    CURRENT_DATE + TIME '11:00:00',
    'Conference Room A'
  ),
  (
    v_user_id,
    v_connection_id,
    'event-3',
    'Lunch Break',
    NULL,
    CURRENT_DATE + TIME '12:00:00',
    CURRENT_DATE + TIME '13:00:00',
    'Office Cafeteria'
  ),
  (
    v_user_id,
    v_connection_id,
    'event-4',
    'Client Call',
    'Q1 Planning discussion',
    CURRENT_DATE + TIME '14:00:00',
    CURRENT_DATE + TIME '15:00:00',
    'Zoom'
  ),
  (
    v_user_id,
    v_connection_id,
    'event-5',
    'Evening Walk',
    'Recovery activity',
    CURRENT_DATE + TIME '18:00:00',
    CURRENT_DATE + TIME '19:00:00',
    'Local Park'
  );
END $$;
```

---

## 5. Create Test Focus Mode Preference

```sql
-- Replace USER_ID with your actual user ID
INSERT INTO focus_mode_preferences (
  user_id,
  mode,
  custom_focus_keywords
)
VALUES (
  'USER_ID', -- REPLACE THIS
  'balanced',
  NULL
)
ON CONFLICT (user_id) DO NOTHING;
```

---

## 6. Create Test Layout Customization

```sql
-- Replace USER_ID with your actual user ID
INSERT INTO layout_customizations (
  user_id,
  page_id,
  sections
)
VALUES (
  'USER_ID', -- REPLACE THIS
  'dashboard',
  '[
    {"id": "briefing", "visible": true, "order": 1, "collapsed": false},
    {"id": "decision", "visible": true, "order": 2, "collapsed": false},
    {"id": "patterns", "visible": true, "order": 3, "collapsed": false},
    {"id": "activity", "visible": true, "order": 4, "collapsed": false},
    {"id": "recovery", "visible": true, "order": 5, "collapsed": false}
  ]'::jsonb
)
ON CONFLICT (user_id, page_id) DO UPDATE
SET sections = EXCLUDED.sections;
```

---

## 7. Quick Test: Create a Challenge

```sql
-- Replace USER_ID with your actual user ID
INSERT INTO user_challenges (
  user_id,
  challenge_title,
  challenge_description,
  challenge_type,
  target_value,
  current_progress,
  week_start_date,
  status
)
VALUES (
  'USER_ID', -- REPLACE THIS
  'Consistency Challenge',
  'Exercise at least 30 minutes every day this week',
  'activity',
  7,
  2,
  date_trunc('week', CURRENT_DATE)::date,
  'active'
);
```

---

## 8. Quick Test: Create a Weekly Reflection

```sql
-- Replace USER_ID with your actual user ID
INSERT INTO weekly_reflections (
  user_id,
  week_start_date,
  week_end_date,
  rating,
  notes,
  highlights,
  challenges
)
VALUES (
  'USER_ID', -- REPLACE THIS
  date_trunc('week', CURRENT_DATE - INTERVAL '7 days')::date,
  (date_trunc('week', CURRENT_DATE - INTERVAL '7 days') + INTERVAL '6 days')::date,
  4,
  'Overall a good week with consistent training',
  'Hit all my workout goals and felt strong throughout',
  'Sleep was a bit inconsistent mid-week due to work stress'
)
ON CONFLICT (user_id, week_start_date) DO NOTHING;
```

---

## Verification: Check All Test Data

```sql
-- Replace USER_ID with your actual user ID
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- REPLACE THIS
BEGIN
  RAISE NOTICE 'Wearable Data: % days', (SELECT COUNT(*) FROM wearable_daily_summary WHERE user_id = v_user_id);
  RAISE NOTICE 'Patterns: %', (SELECT COUNT(*) FROM user_context_enhanced WHERE user_id = v_user_id);
  RAISE NOTICE 'Daily Briefings: %', (SELECT COUNT(*) FROM daily_briefings WHERE user_id = v_user_id);
  RAISE NOTICE 'Calendar Events: %', (SELECT COUNT(*) FROM google_calendar_events WHERE user_id = v_user_id);
  RAISE NOTICE 'Challenges: %', (SELECT COUNT(*) FROM user_challenges WHERE user_id = v_user_id);
  RAISE NOTICE 'Reflections: %', (SELECT COUNT(*) FROM weekly_reflections WHERE user_id = v_user_id);
END $$;
```

---

## Clean Up Test Data (After Testing)

```sql
-- Replace USER_ID with your actual user ID
-- WARNING: This deletes all test data!
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- REPLACE THIS
BEGIN
  DELETE FROM google_calendar_events WHERE user_id = v_user_id;
  DELETE FROM google_calendar_connections WHERE user_id = v_user_id;
  DELETE FROM weekly_reflections WHERE user_id = v_user_id;
  DELETE FROM user_challenges WHERE user_id = v_user_id;
  DELETE FROM user_shown_patterns WHERE user_id = v_user_id;
  DELETE FROM daily_briefings WHERE user_id = v_user_id;
  DELETE FROM user_context_enhanced WHERE user_id = v_user_id;
  DELETE FROM wearable_daily_summary WHERE user_id = v_user_id;
  DELETE FROM layout_customizations WHERE user_id = v_user_id;
  DELETE FROM focus_mode_preferences WHERE user_id = v_user_id;

  RAISE NOTICE 'All test data deleted for user';
END $$;
```

---

## Alternative: One-Click Setup Script

Copy and run this entire script (replace USER_ID once at the top):

```sql
-- ONE-CLICK SETUP SCRIPT
-- Replace this USER_ID and run the entire script
DO $$
DECLARE
  v_user_id uuid := 'USER_ID'; -- REPLACE THIS WITH YOUR USER ID
  v_date date;
  v_connection_id uuid;
BEGIN
  RAISE NOTICE 'Setting up test data for user: %', v_user_id;

  -- 1. Wearable data
  FOR i IN 0..13 LOOP
    v_date := CURRENT_DATE - i;
    INSERT INTO wearable_daily_summary (user_id, date, source, total_steps, active_calories, resting_heart_rate, hrv_avg, sleep_score, readiness_score, activity_score, total_sleep_minutes, deep_sleep_minutes, rem_sleep_minutes, light_sleep_minutes)
    VALUES (v_user_id, v_date, 'oura', 8000 + (random() * 4000)::int, 300 + (random() * 200)::int, 55 + (random() * 15)::int, 45 + (random() * 30)::int, 70 + (random() * 25)::int, 75 + (random() * 20)::int, 80 + (random() * 15)::int, 420 + (random() * 60)::int, 90 + (random() * 30)::int, 80 + (random() * 40)::int, 200 + (random() * 60)::int)
    ON CONFLICT DO NOTHING;
  END LOOP;
  RAISE NOTICE '✓ Created wearable data';

  -- 2. Patterns
  INSERT INTO user_context_enhanced (user_id, pattern_type, context_summary, confidence_score, source_data_count) VALUES
    (v_user_id, 'sleep_pattern', 'You tend to get better sleep on days when you exercise in the morning', 0.85, 12),
    (v_user_id, 'recovery_pattern', 'Your HRV typically drops 2-3 days after high-intensity training', 0.72, 8),
    (v_user_id, 'activity_pattern', 'You are most active on Tuesdays and Thursdays', 0.91, 15);
  RAISE NOTICE '✓ Created patterns';

  -- 3. Daily briefings
  FOR i IN 0..6 LOOP
    v_date := date_trunc('week', CURRENT_DATE)::date + i;
    INSERT INTO daily_briefings (user_id, briefing_date, primary_insight, secondary_insight, recommendation, focus_area, tone)
    VALUES (v_user_id, v_date, 'Daily insight ' || i, 'Secondary insight', 'Recommendation ' || i, 'balance', 'coach')
    ON CONFLICT DO NOTHING;
  END LOOP;
  RAISE NOTICE '✓ Created daily briefings';

  -- 4. Calendar
  INSERT INTO google_calendar_connections (user_id, google_calendar_id, calendar_name, access_token, refresh_token, token_expires_at)
  VALUES (v_user_id, 'test@test.com', 'Test Calendar', 'test-token', 'test-refresh', NOW() + INTERVAL '1 hour')
  RETURNING id INTO v_connection_id;

  INSERT INTO google_calendar_events (user_id, connection_id, event_id, summary, start_time, end_time) VALUES
    (v_user_id, v_connection_id, 'e1', 'Morning Workout', CURRENT_DATE + TIME '07:00:00', CURRENT_DATE + TIME '08:00:00'),
    (v_user_id, v_connection_id, 'e2', 'Team Meeting', CURRENT_DATE + TIME '10:00:00', CURRENT_DATE + TIME '11:00:00'),
    (v_user_id, v_connection_id, 'e3', 'Lunch', CURRENT_DATE + TIME '12:00:00', CURRENT_DATE + TIME '13:00:00');
  RAISE NOTICE '✓ Created calendar events';

  -- 5. Challenge
  INSERT INTO user_challenges (user_id, challenge_title, challenge_description, challenge_type, target_value, week_start_date, status)
  VALUES (v_user_id, 'Test Challenge', 'Exercise 5 days this week', 'activity', 5, date_trunc('week', CURRENT_DATE)::date, 'active');
  RAISE NOTICE '✓ Created challenge';

  -- 6. Focus mode
  INSERT INTO focus_mode_preferences (user_id, mode) VALUES (v_user_id, 'balanced') ON CONFLICT DO NOTHING;
  RAISE NOTICE '✓ Created focus mode';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Test data setup complete!';
  RAISE NOTICE 'You can now test all features in Groups 4-7';
END $$;
```

---

## Usage Tips

1. **Run scripts in order** if doing manual setup
2. **Use one-click script** for fastest setup
3. **Verify data** after setup with verification query
4. **Clean up** after testing (optional)
5. **Real data preferred** when available

---

## Troubleshooting

### Error: "USER_ID violates foreign key constraint"
**Fix**: Make sure you're using a valid user ID from auth.users

### Error: "Duplicate key value violates unique constraint"
**Fix**: Data already exists. Either clean up first or skip conflicting records.

### Error: "Permission denied for table"
**Fix**: Run queries as authenticated user in SQL Editor (not as postgres user)

### Warning: RLS policies
**Fix**: These scripts bypass RLS by running in SQL Editor. In app, RLS will apply normally.

---

**Test Data Setup Version**: 1.0
**Last Updated**: 2026-02-08
