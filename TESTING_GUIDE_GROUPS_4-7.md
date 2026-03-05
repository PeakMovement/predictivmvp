# Testing Guide: Groups 4-7
## Dashboard Personalization, Patterns, Weekly Planner & Reflections

This guide provides comprehensive testing procedures for features built in Groups 4-7.

---

## Prerequisites

### Initial Setup
1. **User Account**: Have a registered user account with authentication working
2. **Database Access**: Verify Supabase connection is active
3. **Wearable Data**: Have some wearable data (Oura/Polar) synced for meaningful insights
4. **Time**: Some features require specific times/days for testing

### Verify Database Tables Exist
Run this query in Supabase SQL Editor:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'focus_mode_preferences',
  'user_shown_patterns',
  'user_challenges',
  'weekly_reflections',
  'layout_customizations'
);
```
Expected: All 5 tables should be listed.

---

## GROUP 4: Dashboard Personalization Engine

### Test 4.1: Focus Mode Selection

#### Test Steps:
1. Navigate to Dashboard page (`/dashboard`)
2. Look for "Focus Mode" selector near the top
3. Click on the selector dropdown

#### Expected Results:
- ✅ Four options visible: "Balanced View", "Recovery First", "Training First", "Custom Focus"
- ✅ Default selection is "Balanced View"
- ✅ Each option has an icon and description

#### Verify Focus Mode Switching:
1. Select "Recovery First"
2. Observe dashboard content reorganization
3. Check that recovery metrics are prominent
4. Verify layout saves automatically

**Database Check:**
```sql
SELECT * FROM focus_mode_preferences
WHERE user_id = auth.uid();
```
Expected: Record with `mode = 'recovery-first'`

---

### Test 4.2: Custom Focus Mode

#### Test Steps:
1. Select "Custom Focus" from the focus mode dropdown
2. Click "Edit Custom Focus" button that appears
3. In the dialog, enter custom keywords (e.g., "sleep", "heart rate", "stress")
4. Click "Save Custom Focus"

#### Expected Results:
- ✅ Modal opens with textarea
- ✅ Can enter multiple comma-separated keywords
- ✅ Saves successfully with toast notification
- ✅ Dashboard updates to show only relevant sections
- ✅ Custom focus persists on page reload

**Database Check:**
```sql
SELECT custom_focus_keywords FROM focus_mode_preferences
WHERE user_id = auth.uid();
```
Expected: Your custom keywords in array format

---

### Test 4.3: Learned Patterns Section

#### Test Steps:
1. On Dashboard, scroll to "What Yves Has Learned About You" section
2. Look for pattern cards with:
   - Pattern title
   - Description
   - Confidence indicator (Low/Medium/High)
   - Timestamp
   - Dismiss button

#### Expected Results:
- ✅ Patterns display if they exist in database
- ✅ Confidence shown as colored badge
- ✅ Each pattern has descriptive text
- ✅ "Dismiss" button visible on each card

**Database Check:**
```sql
SELECT * FROM user_context_enhanced
WHERE user_id = auth.uid()
AND pattern_type IS NOT NULL
ORDER BY created_at DESC;
```

---

### Test 4.4: Pattern Dismissal

#### Test Steps:
1. Find a pattern card in "What Yves Has Learned" section
2. Click "Dismiss" button
3. Observe pattern removal

#### Expected Results:
- ✅ Pattern card fades out and disappears
- ✅ Success toast: "Pattern dismissed"
- ✅ Pattern doesn't reappear on page refresh
- ✅ Other patterns remain visible

**Database Check:**
```sql
SELECT * FROM user_shown_patterns
WHERE user_id = auth.uid()
AND dismissed = true;
```
Expected: Record for the dismissed pattern

---

### Test 4.5: Layout Customization

#### Test Steps:
1. On Dashboard, click "Customize Layout" button (top right)
2. Layout editor should open with list of sections
3. Try these actions:
   - Toggle section visibility (eye icon)
   - Move section up/down (arrow buttons)
   - Toggle "Collapsed by default" option
4. Click "Preview" to see changes
5. Click "Save Layout"

#### Expected Results:
- ✅ Editor shows all available sections
- ✅ Visibility toggles work (sections show/hide)
- ✅ Move up/down reorders sections
- ✅ Preview mode shows actual layout
- ✅ Save persists changes
- ✅ Layout preserved on reload

**Database Check:**
```sql
SELECT * FROM layout_customizations
WHERE user_id = auth.uid()
AND page_id = 'dashboard';
```
Expected: JSON structure with section configurations

#### Test Reset to Default:
1. Open layout editor
2. Click "Reset to Default"
3. Confirm in dialog

**Expected**: Layout returns to original state, database record deleted

---

## GROUP 5: Observed Patterns & Learning

### Test 5.1: Pattern Generation (Backend)

#### Test Steps:
1. Ensure you have wearable data for at least 7 days
2. Trigger pattern analysis manually (if testing locally):
   ```bash
   # Call the edge function
   curl -X POST 'YOUR_SUPABASE_URL/functions/v1/detect-health-anomalies' \
   -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

#### Expected Results:
- ✅ Function executes without errors
- ✅ Patterns are created in `user_context_enhanced` table
- ✅ Patterns appear on Dashboard within a few seconds

**Database Check:**
```sql
SELECT
  pattern_type,
  context_summary,
  confidence_score,
  created_at
FROM user_context_enhanced
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;
```

---

### Test 5.2: Pattern Display with Confidence

#### Test Steps:
1. View Dashboard with patterns displayed
2. Check each pattern card for:
   - Confidence badge color
   - Confidence text (Low/Medium/High)
   - Appropriate icon based on pattern type

#### Confidence Level Testing:
- **Low (< 0.5)**: Yellow badge, tentative language
- **Medium (0.5-0.75)**: Blue badge, moderate confidence
- **High (> 0.75)**: Green badge, strong confidence

#### Expected Results:
- ✅ Confidence displayed correctly
- ✅ Badge colors match confidence level
- ✅ Icons appropriate for pattern types (sleep, activity, recovery, etc.)

---

### Test 5.3: Pattern Persistence

#### Test Steps:
1. Note the patterns shown on Dashboard
2. Dismiss one pattern
3. Reload page
4. Navigate away and return to Dashboard

#### Expected Results:
- ✅ Dismissed pattern stays dismissed
- ✅ Other patterns remain visible
- ✅ No duplicate patterns shown
- ✅ Pattern order consistent

---

## GROUP 6: Weekly Planner Foundation

### Test 6.1: Weekly Briefing Generation

#### Test Steps:
1. Navigate to Planner page (`/planner`)
2. Wait for weekly briefing to load
3. Observe the structure

#### Expected Results:
- ✅ Week date range displayed (Mon-Sun)
- ✅ "Week Intent" section with statement
- ✅ Guardrails: "Prioritize" and "Be Mindful Of"
- ✅ "Your Week at a Glance" summary
- ✅ Weekly themes (if data exists)

**If No Data Shows:**
Run manual briefing generation:
```sql
-- Check if daily briefings exist
SELECT COUNT(*) FROM daily_briefings
WHERE user_id = auth.uid()
AND created_at >= NOW() - INTERVAL '7 days';
```
Need at least 3 daily briefings for weekly aggregation.

---

### Test 6.2: Weekly Themes Display

#### Test Steps:
1. On Planner page, scroll to "Themes This Week"
2. Examine theme cards for:
   - Theme label
   - Days count
   - Description
   - Tone-based styling (Coach/Warm/Strategic)
   - "Accept Challenge" button

#### Tone Verification:
- **Coach**: Primary blue color, zap icon
- **Warm**: Emerald green color, heart icon
- **Strategic**: Blue color, scale icon

#### Expected Results:
- ✅ Themes displayed in grid layout
- ✅ Correct styling based on tone
- ✅ Each theme has challenge button
- ✅ Day count matches description

---

### Test 6.3: Week Intent Section

#### Test Steps:
1. Find "Week Intent" section at top of Planner
2. Verify structure:
   - Shield icon
   - Intent statement
   - Two guardrails in grid

#### Expected Results:
- ✅ Intent statement is personalized
- ✅ "Prioritize" section (green, checkmark icon)
- ✅ "Be Mindful Of" section (amber, alert icon)
- ✅ Tone styling applied consistently

---

## GROUP 7: Planner Page Evolution

### Test 7.1: Week/Day View Toggle

#### Test Steps:
1. On Planner page, look for tabs near top
2. Verify two tabs: "Week View" and "Day View"
3. Default should be "Week View"
4. Click "Day View" tab

#### Expected Results:
- ✅ Tabs are clearly visible
- ✅ Week View selected by default
- ✅ Clicking Day View switches content
- ✅ Smooth transition between views
- ✅ Selected tab is highlighted

---

### Test 7.2: Daily Plan View (Without Calendar)

#### Test Steps:
1. Switch to "Day View" tab
2. If Google Calendar NOT connected, verify empty state

#### Expected Results:
- ✅ Shows empty state card
- ✅ Calendar icon displayed
- ✅ Message: "Connect your Google Calendar..."
- ✅ "Connect Google Calendar" button present
- ✅ Clicking button redirects to Settings

---

### Test 7.3: Daily Plan View (With Calendar)

**Prerequisites**: Connect Google Calendar first via Settings page

#### Test Steps:
1. Navigate to Settings (`/settings`)
2. Find Google Calendar section
3. Click "Connect Google Calendar"
4. Complete OAuth flow
5. Return to Planner → Day View

#### Expected Results:
- ✅ Shows current date prominently
- ✅ Hour-by-hour schedule (24 hours)
- ✅ Current hour highlighted differently
- ✅ Events displayed in appropriate time slots
- ✅ Event details: title, time range, location, description
- ✅ Empty hours show "No events scheduled"

**Database Check:**
```sql
SELECT * FROM google_calendar_connections
WHERE user_id = auth.uid();

SELECT * FROM google_calendar_events
WHERE user_id = auth.uid()
AND start_time::date = CURRENT_DATE
ORDER BY start_time;
```

---

### Test 7.4: Daily View Navigation

#### Test Steps:
1. In Day View, locate navigation buttons:
   - Previous day (left arrow)
   - "Today" button
   - Next day (right arrow)
2. Click "Next Day" several times
3. Click "Today" to return to current date
4. Click "Previous Day" to go backward

#### Expected Results:
- ✅ Date updates correctly with each click
- ✅ Events update based on selected date
- ✅ "Today" button always returns to current date
- ✅ Header shows selected date prominently
- ✅ Week mini-calendar reflects selected date

---

### Test 7.5: Week Mini-Calendar

#### Test Steps:
1. In Day View, locate the week overview (7 day boxes)
2. Current selected day should be highlighted
3. Click on different days in the week

#### Expected Results:
- ✅ Shows Monday-Sunday of current week
- ✅ Selected day highlighted in primary color
- ✅ Other days have secondary background
- ✅ Clicking day updates main schedule
- ✅ Week updates when navigating across week boundaries

---

### Test 7.6: Challenge Acceptance Flow

#### Test Steps:
1. Go to Planner → Week View
2. Find a theme card in "Themes This Week"
3. Click "Accept Challenge" button
4. Observe modal that opens

#### Expected Results:
- ✅ Modal opens with trophy icon
- ✅ Shows challenge title and description
- ✅ "What happens next?" section explains process
- ✅ Two buttons: "Maybe Later" and "Accept Challenge"
- ✅ Can close modal with X or "Maybe Later"

#### Accept Challenge:
1. Click "Accept Challenge" button
2. Wait for confirmation

#### Expected Results:
- ✅ Success toast: "Challenge Accepted!"
- ✅ Modal closes automatically
- ✅ Message: "Track your progress in Training page"

**Database Check:**
```sql
SELECT * FROM user_challenges
WHERE user_id = auth.uid()
AND status = 'active'
ORDER BY accepted_at DESC;
```
Expected: New challenge record created

---

### Test 7.7: Challenge Display in Training Page

#### Test Steps:
1. After accepting a challenge, navigate to Training page (`/training`)
2. Look for "Accountability Challenges" section
3. Find your accepted challenge

#### Expected Results:
- ✅ Challenge card displayed
- ✅ Shows challenge title and description
- ✅ Progress bar if target value exists
- ✅ Current progress displayed
- ✅ "Mark Complete" button
- ✅ "Abandon" button
- ✅ Start date shown

---

### Test 7.8: Complete Challenge

#### Test Steps:
1. On Training page, find active challenge
2. Click "Mark Complete" button
3. Observe changes

#### Expected Results:
- ✅ Success toast: "Challenge Completed!"
- ✅ Challenge moves to completed section
- ✅ Completed date recorded
- ✅ Status changed in database

**Database Check:**
```sql
SELECT status, completed_at
FROM user_challenges
WHERE id = 'CHALLENGE_ID';
```
Expected: `status = 'completed'`, `completed_at` has timestamp

---

### Test 7.9: Abandon Challenge

#### Test Steps:
1. Accept a new challenge
2. On Training page, click "Abandon" button
3. Confirm action

#### Expected Results:
- ✅ Toast: "Challenge Abandoned"
- ✅ Challenge removed from active list
- ✅ Status changed to 'abandoned' in database
- ✅ Can accept new challenges

---

### Test 7.10: Weekly Reflection Prompt (Time-Based)

**Prerequisites**: Test on Sunday evening after 6 PM, or modify system time

#### Test Steps:
1. On Sunday after 6 PM, navigate to Planner page
2. Modal should automatically appear (if not already reflected this week)

#### Expected Results:
- ✅ Modal appears automatically
- ✅ Title: "How Was Your Week?"
- ✅ Shows week date range
- ✅ 5-star rating system visible
- ✅ Optional text fields: highlights, challenges, notes
- ✅ Can skip with "Skip for Now"
- ✅ Submit button requires rating selection

---

### Test 7.11: Submit Weekly Reflection

#### Test Steps:
1. In reflection modal, select a star rating (1-5)
2. Optionally fill in text fields:
   - What went well
   - What was difficult
   - Additional thoughts
3. Click "Submit Reflection"

#### Expected Results:
- ✅ Toast: "Reflection Saved"
- ✅ Modal closes
- ✅ Cannot submit duplicate for same week
- ✅ Data saved to database

**Database Check:**
```sql
SELECT * FROM weekly_reflections
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 1;
```
Expected: New reflection with your rating and notes

---

### Test 7.12: Reflection Duplicate Prevention

#### Test Steps:
1. After submitting reflection, try to submit again
2. Reload page and check if modal appears

#### Expected Results:
- ✅ Modal does not appear again for same week
- ✅ Attempting manual submission shows error
- ✅ Database constraint prevents duplicates
- ✅ Can only have one reflection per week

**Database Check:**
```sql
SELECT COUNT(*) FROM weekly_reflections
WHERE user_id = auth.uid()
AND week_start_date = CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::int + 1;
```
Expected: Count = 1 (not more)

---

## Cross-Feature Integration Tests

### Integration Test 1: Focus Mode + Patterns
1. Select "Recovery First" focus mode
2. Check that recovery-related patterns are prioritized
3. Dismiss a non-recovery pattern
4. Verify dismissed pattern doesn't affect focus mode

### Integration Test 2: Weekly Briefing + Challenges
1. View weekly themes in Planner
2. Accept a challenge
3. Navigate to Training page
4. Complete the challenge
5. Return to Planner
6. Verify challenge completion affects recommendations

### Integration Test 3: Daily View + Challenges
1. Accept a training-related challenge
2. Switch to Day View
3. Verify calendar events align with challenge goals
4. Track progress throughout the week

### Integration Test 4: Reflection + Future Recommendations
1. Submit a weekly reflection with specific feedback
2. Wait for next week's briefing
3. Check if recommendations adapt based on reflection
4. Verify Yves learns from your feedback

---

## Edge Cases & Error Handling

### Edge Case 1: No Wearable Data
**Test**: Access Dashboard/Planner without any wearable data
**Expected**:
- Graceful empty states
- Helpful messages
- No errors in console

### Edge Case 2: Partial Data
**Test**: Have only 1-2 days of data
**Expected**:
- System still functions
- Limited insights shown
- Encouragement to sync more data

### Edge Case 3: Network Failures
**Test**: Disconnect internet, try to accept challenge
**Expected**:
- Error toast with helpful message
- No partial database writes
- Can retry when back online

### Edge Case 4: Multiple Tabs Open
**Test**: Open Planner in two browser tabs
**Expected**:
- Changes in one tab don't break the other
- Refresh shows latest data
- No duplicate submissions

### Edge Case 5: Browser Refresh During Modal
**Test**: Open reflection modal, refresh page
**Expected**:
- Modal closes
- No data loss
- Can reopen and continue

---

## Performance Testing

### Load Time Benchmarks
- **Dashboard Load**: < 2 seconds with data
- **Pattern Display**: < 1 second
- **Focus Mode Switch**: < 500ms
- **Day View Render**: < 1 second with 20 events
- **Challenge Modal**: Opens instantly

### Database Query Performance
```sql
-- Check slow queries
SELECT * FROM user_challenges WHERE user_id = auth.uid(); -- Should be < 50ms
SELECT * FROM weekly_reflections WHERE user_id = auth.uid(); -- Should be < 50ms
SELECT * FROM focus_mode_preferences WHERE user_id = auth.uid(); -- Should be < 30ms
```

---

## Common Issues & Troubleshooting

### Issue: Patterns Not Showing
**Cause**: No wearable data or insufficient data
**Fix**:
1. Sync wearable device
2. Manually trigger pattern detection
3. Wait 24 hours for automated analysis

### Issue: Challenge Not Appearing in Training
**Cause**: Database sync delay or RLS policy issue
**Fix**:
1. Check browser console for errors
2. Verify RLS policies are correct
3. Refresh page

### Issue: Weekly Reflection Not Prompting
**Cause**: Not Sunday evening or already reflected
**Fix**:
1. Verify date/time
2. Check if reflection already exists in DB
3. Manually trigger by reloading on Sunday after 6pm

### Issue: Day View Shows No Events
**Cause**: Google Calendar not connected or no events
**Fix**:
1. Connect Google Calendar in Settings
2. Verify events exist in Google Calendar
3. Manually sync by calling fetch function

### Issue: Layout Changes Not Saving
**Cause**: Database connection or RLS policy issue
**Fix**:
1. Check browser console
2. Verify user is authenticated
3. Check RLS policies on layout_customizations table

---

## Final Verification Checklist

After completing all tests, verify:

- [ ] All database tables have proper RLS policies
- [ ] No console errors during normal operation
- [ ] All modals open/close properly
- [ ] Toast notifications appear for all actions
- [ ] Layout customizations persist across sessions
- [ ] Focus modes affect dashboard correctly
- [ ] Patterns can be dismissed and stay dismissed
- [ ] Challenges flow from Planner to Training
- [ ] Weekly reflections save and prevent duplicates
- [ ] Day View integrates with Google Calendar
- [ ] Navigation works smoothly between all views
- [ ] Mobile responsive (test on smaller screens)
- [ ] Dark mode works correctly (if applicable)
- [ ] Performance is acceptable (see benchmarks above)

---

## Success Criteria

**All tests pass if:**
1. ✅ Users can customize their dashboard layout
2. ✅ Focus modes filter content appropriately
3. ✅ Patterns are displayed, dismissed, and learned from
4. ✅ Weekly planner shows personalized themes and intent
5. ✅ Users can switch between week and day views
6. ✅ Challenges can be accepted, tracked, and completed
7. ✅ Weekly reflections are collected and stored
8. ✅ All database operations use RLS correctly
9. ✅ No data loss or duplication occurs
10. ✅ UI is responsive and intuitive

---

## Reporting Issues

When reporting issues, include:
1. Test scenario number
2. Steps to reproduce
3. Expected vs actual behavior
4. Browser console errors (if any)
5. Database query results (when applicable)
6. Screenshots or screen recordings

---

## Next Steps After Testing

1. **Performance Optimization**: Address any slow queries or renders
2. **UI Polish**: Refine animations and transitions
3. **Error Messages**: Improve user-facing error messages
4. **Documentation**: Update user-facing help text
5. **Analytics**: Add tracking for feature usage
6. **A/B Testing**: Test different layouts and flows
7. **User Feedback**: Collect real user feedback on features

---

**Testing Version**: 1.0
**Last Updated**: 2026-02-08
**Features Covered**: Groups 4, 5, 6, 7
