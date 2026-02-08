# Testing Documentation: Groups 4-7
## Complete Testing Suite for Dashboard Personalization, Patterns, Weekly Planner & Reflections

Welcome to the testing documentation for the features built in Groups 4-7. This README will guide you to the right testing resource.

---

## 📚 Available Testing Documents

### 1. **Quick Start** → [`QUICK_TEST_SCENARIOS.md`](./QUICK_TEST_SCENARIOS.md)
**⏱️ Time: 15 minutes**

Perfect for:
- First-time testers
- Quick smoke testing
- Demo preparation
- Rapid feature verification

**What's Included**:
- 6 essential scenarios
- Step-by-step instructions
- Pass/fail criteria
- Common fixes

**Start Here If**: You want to verify core functionality fast.

---

### 2. **Comprehensive Testing** → [`TESTING_GUIDE_GROUPS_4-7.md`](./TESTING_GUIDE_GROUPS_4-7.md)
**⏱️ Time: 2-3 hours**

Perfect for:
- QA testing
- Pre-release validation
- Regression testing
- Feature acceptance

**What's Included**:
- Detailed test cases for all 4 groups
- Expected behaviors
- Database verification queries
- Edge cases and error handling
- Performance benchmarks
- Integration tests
- Troubleshooting guide

**Start Here If**: You need thorough testing before release.

---

### 3. **Testing Checklist** → [`TESTING_CHECKLIST.md`](./TESTING_CHECKLIST.md)
**⏱️ Time: 30-60 minutes**

Perfect for:
- Systematic testing
- Sign-off documentation
- Team coordination
- Quick reference

**What's Included**:
- Checkbox format
- All critical tests
- Database queries
- Sign-off section
- Issue tracking

**Start Here If**: You want a structured, printable checklist.

---

### 4. **Test Data Setup** → [`TEST_DATA_SETUP.md`](./TEST_DATA_SETUP.md)
**⏱️ Time: 5-10 minutes**

Perfect for:
- Local development
- Demo environments
- Missing wearable data
- Fresh database testing

**What's Included**:
- SQL scripts for all data types
- One-click setup script
- Verification queries
- Cleanup scripts

**Start Here If**: You need test data to begin testing.

---

## 🚀 Recommended Testing Workflow

### For First-Time Testers:

```
1. Setup Test Data (5 min)
   ↓
2. Quick Test Scenarios (15 min)
   ↓
3. Comprehensive Guide (2-3 hours)
   ↓
4. Sign Off with Checklist
```

### For Experienced Testers:

```
1. Checklist for systematic coverage (30-60 min)
   ↓
2. Refer to Comprehensive Guide for details
   ↓
3. Use Quick Scenarios for smoke testing
```

### For Demo Preparation:

```
1. Setup Test Data (5 min)
   ↓
2. Quick Test Scenarios (15 min)
   ↓
3. Practice key flows
```

---

## 📊 What Was Built (Groups 4-7)

### GROUP 4: Dashboard Personalization Engine
- ✅ Focus modes (Balanced, Recovery, Training, Custom)
- ✅ Learned patterns display
- ✅ Pattern dismissal
- ✅ Layout customization editor
- ✅ Personal context chips

### GROUP 5: Observed Patterns & Learning
- ✅ Automated pattern detection
- ✅ Confidence scoring
- ✅ Pattern persistence
- ✅ Backend generation

### GROUP 6: Weekly Planner Foundation
- ✅ Weekly briefing aggregation
- ✅ Week intent with guardrails
- ✅ Weekly themes with tone adaptation
- ✅ Weekly overview page

### GROUP 7: Planner Page Evolution
- ✅ Week/Day view tabs
- ✅ Hour-by-hour daily schedule
- ✅ Google Calendar integration
- ✅ Challenge acceptance flow
- ✅ Weekly reflection prompts
- ✅ Challenge tracking in Training

---

## 🗄️ New Database Tables

All RLS-enabled with proper policies:

1. `focus_mode_preferences` - User's focus mode settings
2. `user_shown_patterns` - Dismissed patterns tracking
3. `layout_customizations` - Custom dashboard layouts
4. `user_challenges` - Accepted challenges
5. `weekly_reflections` - Weekly feedback

---

## ✅ Testing Prerequisites

Before you start testing, ensure:

- [ ] User account created and logged in
- [ ] Supabase connection working
- [ ] Browser console open (F12)
- [ ] Database tables exist (run verification query)
- [ ] Test data populated OR real wearable data synced

**Quick Verification Query**:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'focus_mode_preferences',
  'user_shown_patterns',
  'user_challenges',
  'weekly_reflections',
  'layout_customizations'
);
```

---

## 🎯 Critical Tests (Must Pass)

These are the absolute must-pass tests:

1. **Dashboard loads without errors**
2. **Can switch focus modes**
3. **Patterns display and can be dismissed**
4. **Layout customization saves**
5. **Weekly planner shows overview**
6. **Can accept challenges**
7. **Day view displays schedule**
8. **Weekly reflection submits**
9. **All data persists after refresh**
10. **No console errors during normal use**

---

## 🐛 Known Issues & Limitations

### Timing-Dependent Features:
- **Weekly Reflection**: Only auto-triggers Sunday after 6 PM
- **Pattern Generation**: Requires 7+ days of wearable data
- **Weekly Briefing**: Needs 3+ daily briefings in current week

### Workarounds:
- Use test data scripts for missing wearable data
- Manually trigger reflection modal for testing
- Check database directly for verification

---

## 📝 Reporting Issues

### Required Information:
1. **Document**: Which testing doc were you using?
2. **Test Case**: Scenario or test number
3. **Steps**: Exact steps to reproduce
4. **Expected**: What should happen
5. **Actual**: What actually happened
6. **Console**: Any browser console errors
7. **Database**: Results of verification queries
8. **Screenshots**: If applicable

### Template:
```markdown
**Test**: [Document name] → [Scenario number]
**Browser**: Chrome/Firefox/Safari
**User Type**: New/Existing with data

**Steps**:
1.
2.
3.

**Expected**: [What should happen]
**Actual**: [What happened]

**Console Errors**: [Paste errors]
**Database Check**: [Query results]
**Screenshot**: [Attach if relevant]
```

---

## 🔧 Quick Troubleshooting

### Issue: Nothing loads
**Check**:
- User is logged in
- Database connection active
- Console for errors

### Issue: No patterns showing
**Fix**: Need 7+ days wearable data or use test data scripts

### Issue: Challenge not in Training
**Fix**: Refresh page, check console

### Issue: Layout not saving
**Fix**: Verify authentication, check RLS policies

### Issue: Day view empty
**Fix**: Connect Google Calendar in Settings

### Issue: Reflection not appearing
**Fix**: Only Sunday after 6 PM, or check if already submitted

---

## 📈 Success Metrics

**Testing is complete when**:

- [ ] All critical tests pass
- [ ] No console errors during normal use
- [ ] Database integrity verified
- [ ] Performance benchmarks met
- [ ] Mobile responsiveness confirmed
- [ ] Edge cases handled gracefully
- [ ] Documentation matches behavior
- [ ] Sign-off completed

---

## 🚦 Testing Status Indicators

### 🟢 Green (Ready for Production)
- All tests pass
- No critical issues
- Performance acceptable
- Documentation complete

### 🟡 Yellow (Minor Issues)
- Core functionality works
- Minor bugs documented
- Can release with known issues
- Plan fixes for next iteration

### 🔴 Red (Blocking Issues)
- Critical tests failing
- Data loss possible
- Security concerns
- Must fix before release

---

## 💡 Best Practices

1. **Test with Real Data**: When possible, use actual wearable data
2. **Test Across Browsers**: Chrome, Firefox, Safari
3. **Test Mobile**: Responsive design matters
4. **Test Edge Cases**: Missing data, network failures, etc.
5. **Verify Database**: Always check data persistence
6. **Document Issues**: Use the issue template
7. **Retest After Fixes**: Regression testing is critical
8. **Performance Monitor**: Watch load times and responsiveness

---

## 📞 Need Help?

### Common Questions:

**Q: Which document should I start with?**
A: Use QUICK_TEST_SCENARIOS.md for your first pass.

**Q: I don't have wearable data. What do I do?**
A: Run scripts from TEST_DATA_SETUP.md to populate test data.

**Q: How do I verify database changes?**
A: Each testing doc includes SQL queries to verify.

**Q: Can I skip any tests?**
A: All critical tests must pass. Others are recommended.

**Q: How long does full testing take?**
A: 15 min (quick) to 3 hours (comprehensive).

---

## 📅 Testing Schedule Recommendation

### Day 1: Initial Setup & Smoke Test
- Setup test data (5 min)
- Run quick test scenarios (15 min)
- Document any blockers

### Day 2: Comprehensive Testing
- Work through full testing guide (2-3 hours)
- Document all issues
- Verify database state

### Day 3: Edge Cases & Polish
- Test error handling
- Mobile responsiveness
- Performance testing
- Final verification

### Day 4: Sign-Off
- Complete checklist
- Retest any fixes
- Documentation review
- Release decision

---

## 🎓 Testing Tips

### For Efficiency:
- Use test data scripts to speed up setup
- Open multiple browser tabs for cross-referencing
- Keep SQL editor open for quick verification
- Use browser bookmarks for test pages

### For Thoroughness:
- Test both happy path and error cases
- Verify data persists after page refresh
- Check all user roles/permissions
- Test with varying amounts of data

### For Quality:
- Clear browser cache between tests
- Test in incognito mode
- Check browser console regularly
- Verify mobile responsiveness

---

## 📚 Additional Resources

- **Architecture**: See `ARCHITECTURE.md`
- **Database Schema**: See `DATABASE_SCHEMA.md`
- **API Documentation**: See `EDGE_FUNCTIONS.md`
- **Deployment**: See `DEPLOYMENT_GUIDE.md`

---

## ✨ Final Notes

These features represent significant enhancements to the platform:
- **Personalization**: Users can customize their experience
- **Intelligence**: System learns from user patterns
- **Planning**: Weekly and daily planning integration
- **Engagement**: Challenges and reflections increase commitment

Quality testing ensures users get the best experience possible.

Happy Testing! 🚀

---

**Testing Documentation Version**: 1.0
**Last Updated**: 2026-02-08
**Features Covered**: Groups 4, 5, 6, 7
**Maintenance**: Update after each new feature release
