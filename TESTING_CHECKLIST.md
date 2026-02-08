# Quick Testing Checklist: Groups 4-7

## Pre-Testing Setup
- [ ] User logged in with active session
- [ ] Wearable data synced (at least 7 days)
- [ ] Database tables verified (5 new tables)
- [ ] Browser console open for error monitoring

---

## GROUP 4: Dashboard Personalization

### Focus Modes
- [ ] Can switch between 4 focus modes (Balanced, Recovery, Training, Custom)
- [ ] Custom focus accepts keywords and filters content
- [ ] Focus preference saves to database and persists
- [ ] Dashboard reorganizes based on selected focus

### Learned Patterns
- [ ] Patterns display with confidence indicators
- [ ] Can dismiss individual patterns
- [ ] Dismissed patterns don't reappear
- [ ] Pattern cards show icons, descriptions, timestamps

### Layout Customization
- [ ] Can open layout editor
- [ ] Toggle section visibility (show/hide)
- [ ] Reorder sections with up/down arrows
- [ ] Preview mode shows changes
- [ ] Save persists layout across sessions
- [ ] Reset to default works

**Database Tables**: `focus_mode_preferences`, `user_shown_patterns`, `layout_customizations`

---

## GROUP 5: Observed Patterns

### Pattern Detection
- [ ] Patterns auto-generate from wearable data
- [ ] Multiple pattern types: sleep, activity, recovery, behavior
- [ ] Confidence scores displayed correctly (Low/Medium/High)
- [ ] Patterns appear in Dashboard "What Yves Has Learned" section

### Pattern Interaction
- [ ] Can dismiss patterns with button click
- [ ] Dismissal tracked in database
- [ ] No duplicate patterns shown
- [ ] Pattern persistence works across sessions

**Database Tables**: `user_context_enhanced`, `user_shown_patterns`

---

## GROUP 6: Weekly Planner Foundation

### Weekly Briefing
- [ ] Planner page loads weekly overview
- [ ] Week date range displayed (Mon-Sun)
- [ ] "Week Intent" section with statement
- [ ] Guardrails: "Prioritize" and "Be Mindful Of"
- [ ] "Your Week at a Glance" summary

### Weekly Themes
- [ ] Themes display in grid layout
- [ ] Each theme shows days count
- [ ] Tone-based styling (Coach/Warm/Strategic icons)
- [ ] Theme descriptions are personalized

**Data Source**: Aggregated from `daily_briefings`

---

## GROUP 7: Planner Evolution

### Week/Day View Toggle
- [ ] Tabs visible: "Week View" and "Day View"
- [ ] Week View shows full weekly overview
- [ ] Day View shows hour-by-hour schedule
- [ ] Smooth tab transitions

### Daily Plan View
- [ ] Empty state if calendar not connected
- [ ] Hour-by-hour schedule (24 hours)
- [ ] Current hour highlighted
- [ ] Calendar events display correctly
- [ ] Event details: time, location, description
- [ ] Navigation: previous/next day, today button
- [ ] Week mini-calendar functional

### Challenge Acceptance
- [ ] "Accept Challenge" button on each theme
- [ ] Modal opens with challenge details
- [ ] Can accept or dismiss
- [ ] Challenge saves to database
- [ ] Success notification appears
- [ ] Challenge appears in Training page
- [ ] Can mark challenge complete
- [ ] Can abandon challenge

### Weekly Reflection
- [ ] Modal auto-appears Sunday evening (after 6pm)
- [ ] 5-star rating system works
- [ ] Optional text fields: highlights, challenges, notes
- [ ] Can skip or submit
- [ ] Submission requires rating
- [ ] Saves to database
- [ ] Prevents duplicate submissions for same week
- [ ] Success notification appears

**Database Tables**: `user_challenges`, `weekly_reflections`, `google_calendar_events`

---

## Integration Tests

- [ ] Focus mode + patterns work together
- [ ] Challenge acceptance flows to Training page
- [ ] Weekly reflection affects future recommendations
- [ ] Day view integrates with Google Calendar
- [ ] Layout customization preserves focus mode

---

## Error Handling

- [ ] No console errors during normal use
- [ ] Graceful handling of missing data
- [ ] Network failure shows helpful messages
- [ ] No partial database writes on errors
- [ ] Can retry failed operations

---

## Performance

- [ ] Dashboard loads in < 2 seconds
- [ ] Focus mode switches in < 500ms
- [ ] Day view renders in < 1 second
- [ ] Modals open instantly
- [ ] No lag when scrolling

---

## Mobile/Responsive

- [ ] All features work on mobile viewport
- [ ] Layout adjusts appropriately
- [ ] Modals fit screen
- [ ] Touch interactions work
- [ ] No horizontal scrolling

---

## Data Verification Queries

```sql
-- Focus modes
SELECT * FROM focus_mode_preferences WHERE user_id = auth.uid();

-- Patterns
SELECT * FROM user_context_enhanced WHERE user_id = auth.uid() AND pattern_type IS NOT NULL;
SELECT * FROM user_shown_patterns WHERE user_id = auth.uid();

-- Layout
SELECT * FROM layout_customizations WHERE user_id = auth.uid();

-- Challenges
SELECT * FROM user_challenges WHERE user_id = auth.uid();

-- Reflections
SELECT * FROM weekly_reflections WHERE user_id = auth.uid();
```

---

## Critical Issues (Stop Testing If Found)

- [ ] Cannot log in or authenticate
- [ ] Database connection failures
- [ ] RLS policies blocking user's own data
- [ ] Complete app crashes or freezes
- [ ] Data loss or corruption

---

## Test Completion Sign-Off

**Tester Name**: _______________
**Date**: _______________
**Build Version**: _______________

**Overall Status**:
- [ ] All tests passed
- [ ] Minor issues found (documented below)
- [ ] Major issues found (testing halted)

**Issues Found**:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Notes**:
_____________________________________________________
_____________________________________________________
_____________________________________________________
