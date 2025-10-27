# Testing Yves Intelligence Integration

## Quick Start Guide

### Prerequisites
- Supabase project is connected and running
- User account created for testing
- Mock mode is enabled (already configured)

---

## Test Scenario 1: Basic Chat Flow (Mock Mode)

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Login
1. Navigate to the login page
2. Use your test credentials
3. Verify successful authentication

### 3. Configure Preferences
1. Click the **Settings** icon (top right)
2. Scroll to **"Yves AI Preferences"**
3. Set preferences:
   - Sleep Goal: `8` hours
   - Training Focus: `Marathon training`
   - Prioritize Recovery: Toggle ON
4. Verify toast shows "Saved"

### 4. Test Chat Interface
1. Click **"Yves AI"** tab in bottom navigation (Sparkles icon)
2. Verify page shows:
   - Title: "Yves Intelligence"
   - Subtitle: "Your AI health coach..."
   - Chat input box
   - Empty state message

### 5. Send First Query
**Query:** "What should I focus on for my marathon training today?"

**Expected Result:**
- Button shows "Thinking..." with spinner
- After ~1 second, response appears:
  ```
  This is a mock AI response. Enable a real AI provider to get actual analysis.
  ```
- Toast notification: "Response received"
- Query appears in history with timestamp
- Response displayed in formatted box

### 6. Send Another Query
**Query:** "How is my recovery looking based on my recent data?"

**Expected Result:**
- New conversation added to history
- Most recent conversation appears at top
- All past conversations visible below

### 7. Test Input Validation
1. Try to submit empty query → Should show error toast
2. Type long query (500+ chars) → Should work fine
3. Try special characters → Should work fine

---

## Test Scenario 2: Database Verification

### Query the Database

1. **Check User Context**
```sql
SELECT
  user_id,
  preferences->>'sleepGoalHours' as sleep_goal,
  preferences->>'trainingFocus' as training_focus,
  preferences->>'recoveryPriority' as recovery_priority,
  updated_at
FROM user_context
ORDER BY updated_at DESC
LIMIT 5;
```

**Expected Result:**
- Your user ID
- Sleep goal: 8
- Training focus: "Marathon training"
- Recovery priority: true

2. **Check Insight History**
```sql
SELECT
  id,
  user_id,
  LEFT(query, 50) as query_preview,
  LEFT(response, 100) as response_preview,
  created_at
FROM insight_history
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- 2 records (one for each query you sent)
- Your user ID matches
- Queries are saved correctly
- Responses are saved
- Timestamps are correct

3. **Verify RLS is Working**
```sql
-- This should only show YOUR conversations
SELECT COUNT(*) as my_conversations
FROM insight_history;

-- Try to access all (should still only show yours due to RLS)
SELECT COUNT(*) as all_conversations
FROM insight_history
WHERE user_id != auth.uid();  -- Should return 0
```

---

## Test Scenario 3: Edge Function Testing

### Direct Edge Function Call

You can test the Edge Function directly using curl:

```bash
# Get your auth token from browser dev tools
# In Console, run: (await supabase.auth.getSession()).data.session.access_token

curl -X POST https://jotmyarnhgjuenchvcgu.supabase.co/functions/v1/yves-chat \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "Test question about my health"}'
```

**Expected Response:**
```json
{
  "success": true,
  "response": "This is a mock AI response. Enable a real AI provider to get actual analysis."
}
```

---

## Test Scenario 4: Error Handling

### 1. Test Unauthenticated Request
1. Open incognito window or log out
2. Try to navigate to Yves AI tab
3. Should redirect to login

### 2. Test Invalid Query
1. Submit empty query → Error toast: "Empty query"
2. Submit whitespace only → Error toast: "Empty query"

### 3. Test Network Error
1. Open browser DevTools → Network tab
2. Enable "Offline" mode
3. Try to send query
4. Should show error toast with network error message

---

## Test Scenario 5: Real AI Testing (Optional)

### Prerequisites
1. Get OpenAI API key from https://platform.openai.com/api-keys
2. Update Supabase secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-real-key-here
   supabase secrets set AI_PROVIDER=openai
   supabase secrets unset AI_MOCK_MODE
   ```
3. Update local .env:
   ```
   VITE_OPENAI_API_KEY=sk-your-real-key-here
   VITE_AI_MOCK_MODE=false
   ```

### Test Queries

1. **Context-Aware Query**
   ```
   Based on my sleep goal of 8 hours and my marathon training focus,
   what should I prioritize today?
   ```
   **Expected:** Response references your sleep goal and training focus

2. **Health Data Query**
   ```
   Looking at my recent health metrics, how is my recovery?
   ```
   **Expected:** Response references available health data or asks for more context

3. **Specific Advice Query**
   ```
   Should I do a hard workout today or take a recovery day?
   ```
   **Expected:** Personalized recommendation based on your data

---

## Troubleshooting

### Issue: Chat interface doesn't load
**Solution:**
1. Check browser console for errors
2. Verify Supabase connection in Settings > Developer Tools > Test Supabase
3. Hard refresh (Ctrl+Shift+R)

### Issue: "Not authenticated" error
**Solution:**
1. Log out and log back in
2. Check if session expired
3. Clear browser cache and cookies

### Issue: Queries not saving to database
**Solution:**
1. Check RLS policies are enabled
2. Verify user ID in user_context table
3. Check Edge Function logs in Supabase dashboard

### Issue: Mock responses even with real API key
**Solution:**
1. Verify `VITE_AI_MOCK_MODE=false` in .env
2. Verify Supabase secrets are set correctly
3. Restart dev server after changing .env
4. Check Edge Function logs for API key issues

### Issue: Slow responses
**Solution:**
1. Check network tab in DevTools
2. OpenAI API can take 2-5 seconds
3. Consider implementing streaming in future

---

## Performance Metrics

### Expected Response Times (Mock Mode)
- Query submission: < 100ms
- Mock response: < 200ms
- Database insert: < 100ms
- History refresh: < 200ms
- **Total:** < 600ms

### Expected Response Times (Real AI)
- Query submission: < 100ms
- OpenAI API call: 2-5 seconds
- Database insert: < 100ms
- History refresh: < 200ms
- **Total:** 2.5-5.5 seconds

---

## Success Criteria

Phase 1 is successful if:

- ✅ User can log in and access Yves AI tab
- ✅ User can set preferences in Settings
- ✅ User can send queries and receive responses
- ✅ Conversations are saved to database
- ✅ History displays correctly in reverse chronological order
- ✅ RLS prevents cross-user data access
- ✅ Error handling works for all edge cases
- ✅ Build completes without errors
- ✅ No TypeScript errors
- ✅ UI is responsive and user-friendly

---

## Next Steps After Testing

Once testing is complete and successful:

1. **Document findings** in test report
2. **Fix any bugs** discovered during testing
3. **Add OpenAI API key** for production
4. **Deploy to production** environment
5. **Monitor usage** and costs
6. **Plan Phase 2** features:
   - Multi-turn conversations
   - Streaming responses
   - Voice input/output
   - Smart notifications
   - Advanced analytics

---

## Support

If you encounter issues during testing:

1. Check `PHASE_1_VERIFICATION.md` for implementation details
2. Review browser console logs
3. Check Supabase Edge Function logs
4. Verify database records using SQL queries
5. Review error messages carefully

Happy Testing! 🚀
