# Quick Test Scenarios: Groups 4-7
## 15-Minute Essential Testing Guide

Get up and running with key feature tests in 15 minutes.

---

## 🚀 Rapid Setup (2 minutes)

1. **Login**: Make sure you're logged in
2. **Check Data**: Verify you have some wearable data synced
3. **Open Console**: F12 → Console tab (watch for errors)

---

## 📊 Scenario 1: Personalize Your Dashboard (3 minutes)

### Goal: Customize dashboard to your needs

1. **Navigate**: Go to Dashboard (`/dashboard`)
2. **Try Focus Modes**:
   - Click focus mode selector at top
   - Select "Recovery First"
   - Observe layout change
3. **Customize Layout**:
   - Click "Customize Layout" button (top right)
   - Toggle a section off (click eye icon)
   - Move a section up/down
   - Click "Save Layout"
   - Refresh page → verify changes persist

**✅ Pass Criteria**:
- Focus mode changes dashboard
- Layout changes save
- No errors in console

---

## 🧠 Scenario 2: Interact with Learned Patterns (2 minutes)

### Goal: See what Yves learned and dismiss unwanted patterns

1. **Find Section**: Scroll to "What Yves Has Learned About You"
2. **Review Patterns**:
   - Note confidence levels (Low/Medium/High badges)
   - Read pattern descriptions
3. **Dismiss Pattern**:
   - Click "Dismiss" on any pattern
   - Observe it disappears
   - Refresh page → verify it stays gone

**✅ Pass Criteria**:
- Patterns display with confidence
- Dismiss works
- Doesn't reappear after refresh

**💡 Tip**: If no patterns show, you need more wearable data (7+ days)

---

## 📅 Scenario 3: Plan Your Week (3 minutes)

### Goal: View weekly plan and accept a challenge

1. **Navigate**: Go to Planner (`/planner`)
2. **Review Weekly Overview**:
   - Check week date range
   - Read "Week Intent" statement
   - Review weekly themes
3. **Accept Challenge**:
   - Find a theme card
   - Click "Accept Challenge"
   - Review modal → click "Accept Challenge"
   - Note success message

**✅ Pass Criteria**:
- Weekly overview displays
- Challenge modal opens
- Challenge saves successfully

---

## 📆 Scenario 4: View Daily Schedule (3 minutes)

### Goal: Switch to day view and navigate schedule

1. **Switch Views**:
   - Click "Day View" tab
   - See hour-by-hour schedule

2. **If Calendar Not Connected**:
   - Note empty state message
   - Click "Connect Google Calendar"
   - **Skip to next scenario**

3. **If Calendar Connected**:
   - Current hour highlighted
   - Navigate: click next/previous day
   - Click "Today" to return
   - Click different days in week calendar

**✅ Pass Criteria**:
- Tab switching works
- Hour view displays
- Navigation functional
- Calendar events show (if connected)

---

## 🏆 Scenario 5: Track Your Challenge (2 minutes)

### Goal: View and complete challenge in Training page

1. **Navigate**: Go to Training page (`/training`)
2. **Find Challenge**:
   - Locate "Accountability Challenges" section
   - Find your accepted challenge
3. **Interact**:
   - Review progress bar
   - Click "Mark Complete"
   - Observe success message
   - Challenge moves to completed

**✅ Pass Criteria**:
- Challenge appears in Training
- Progress displays
- Complete/Abandon buttons work

---

## 💭 Scenario 6: Submit Weekly Reflection (2 minutes)

### Goal: Provide weekly feedback

**Note**: Only works Sunday evening after 6 PM, or test manually

1. **Manual Test**:
   - Go to Planner page
   - Look for reflection modal (auto-appears on Sunday evening)

2. **If Testing Manually**:
   - Open browser console
   - Type: `localStorage.setItem('test-reflection', 'true')`
   - Reload page

3. **Submit Reflection**:
   - Select star rating (1-5)
   - Fill optional fields
   - Click "Submit Reflection"
   - Observe success message

**✅ Pass Criteria**:
- Modal appears at correct time
- Can select rating
- Submission works
- Cannot submit duplicate for same week

---

## 🔍 Quick Verification Queries

Open Supabase SQL Editor and run:

```sql
-- Check focus mode
SELECT mode, custom_focus_keywords FROM focus_mode_preferences WHERE user_id = auth.uid();

-- Check accepted challenges
SELECT challenge_title, status FROM user_challenges WHERE user_id = auth.uid();

-- Check reflections
SELECT rating, week_start_date FROM weekly_reflections WHERE user_id = auth.uid();

-- Check dismissed patterns
SELECT COUNT(*) as dismissed_count FROM user_shown_patterns WHERE user_id = auth.uid() AND dismissed = true;

-- Check layout customization
SELECT page_id, sections FROM layout_customizations WHERE user_id = auth.uid();
```

---

## 🐛 Common Quick Fixes

### Problem: No patterns showing
**Fix**: Need 7+ days of wearable data. Sync your device.

### Problem: Challenge not in Training page
**Fix**: Refresh the page. Check browser console for errors.

### Problem: Layout changes not saving
**Fix**: Check you're logged in. Verify console for RLS errors.

### Problem: Day view shows empty state
**Fix**: Connect Google Calendar in Settings → Calendar section.

### Problem: Reflection modal not appearing
**Fix**: Only shows Sunday after 6 PM if not already reflected.

---

## ✨ Success Indicators

You've successfully tested if:

1. ✅ Dashboard personalizes with focus modes
2. ✅ Can dismiss learned patterns
3. ✅ Weekly planner shows personalized themes
4. ✅ Can switch between week and day views
5. ✅ Challenges flow from Planner to Training
6. ✅ Weekly reflections submit successfully
7. ✅ All changes persist after page refresh
8. ✅ No errors in browser console

---

## 📝 Report Template

**Tested Features**:
- [ ] Dashboard Personalization
- [ ] Learned Patterns
- [ ] Weekly Planner
- [ ] Daily Schedule View
- [ ] Challenge System
- [ ] Weekly Reflections

**Issues Found**:
1. _________________________
2. _________________________
3. _________________________

**Overall Assessment**:
- [ ] Ready for production
- [ ] Minor issues (list above)
- [ ] Major issues blocking release

---

## 🎯 Next: Full Testing

For comprehensive testing, see:
- **TESTING_GUIDE_GROUPS_4-7.md** - Complete test scenarios
- **TESTING_CHECKLIST.md** - Printable checklist

---

**Quick Test Version**: 1.0
**Time to Complete**: ~15 minutes
**Last Updated**: 2026-02-08
