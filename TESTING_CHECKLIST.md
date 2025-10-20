# 🧪 Complete Testing Checklist for Predictiv App

## ✅ All Implementations Completed

### **Phase 1: Navigation & UI Fixes** ✅
- ✅ Fixed bottom navigation responsive display with useEffect hook
- ✅ Fixed metric capitalization (ACWR, HRV, EWMA, etc.)
- ✅ Added null handling for Plan page sleep score

### **Phase 2: Data Synchronization Pipeline** ✅
- ✅ Added `fitbit_data_refreshed` event listener to useFitbitTrends
- ✅ Added `fitbit_data_refreshed` event listener to useUnifiedMetrics
- ✅ Added `fitbit_data_refreshed` event listener to Training.tsx
- ✅ Created automated trigger chain: calc-trends → calculate-baseline → calculate-deviation

### **Phase 3: Edge Function Improvements** ✅
- ✅ calculate-baseline already processes all 8 metrics (HRV, ACWR, EWMA, Monotony, Strain, Training Load, Chronic Load, Acute Load)
- ✅ calculate-deviation already processes all 8 metrics
- ✅ Automated trigger chain now fires after Fitbit sync

---

## 📋 Testing Plan (Execute in Order)

### **TEST 1: Bottom Navigation Responsive Display (2 min)**

**On Desktop/Mac:**
1. Open app in browser (full screen)
2. Check bottom navigation bar
3. **Expected:** Should see all 10 tabs:
   - Dashboard, Training, Health, Documents, Profile, Plan, Baselines, Help, Sync, Dev
4. Resize window to tablet size (768px)
5. **Expected:** All tabs still visible

**On iPhone:**
1. Open app on mobile device
2. Check bottom navigation bar  
3. **Expected:** Should see only 4 tabs:
   - Dashboard, Training, Health, Documents
4. Swipe left/right to see all tabs (scrollable)
5. **Expected:** Can scroll to see all tabs

**Pass Criteria:** ✅ Desktop shows all tabs, mobile shows scrollable 4 primary tabs

---

### **TEST 2: "Update Now" Button - Dashboard (5 min)**

**Pre-Test Setup:**
1. Navigate to Dashboard
2. Note current values:
   - ACWR: ______
   - Strain: ______
   - Sleep Score: ______

**Test Steps:**
1. Click **"Update Now"** button (top-right)
2. Wait 5-10 seconds
3. Watch the 3 metric cards

**Expected Behavior:**
- ✅ All 3 cards should update with new values
- ✅ Values should come from latest Fitbit sync
- ✅ Sleep Score should show calculated value (not "—")
- ✅ Console logs should show:
  ```
  [useUnifiedMetrics] Fitbit data refreshed, reloading...
  [useFitbitTrends] Fitbit data refreshed, reloading trends...
  ```

**Pass Criteria:** ✅ All metrics update, console shows refresh messages

---

### **TEST 3: "Update Now" Button - Training Page (5 min)**

**Pre-Test Setup:**
1. Navigate to Training page
2. Note current values:
   - Recent Sessions: ______
   - Training Monotony: ______
   - Training Strain: ______

**Test Steps:**
1. Go back to Dashboard
2. Click **"Update Now"** button
3. Wait 5-10 seconds
4. Navigate to Training page

**Expected Behavior:**
- ✅ Recent Sessions list updates with latest 5 sessions
- ✅ Training Monotony circle updates (value changes)
- ✅ Training Strain circle updates (value changes)
- ✅ Console logs should show:
  ```
  [Training] Fitbit data refreshed, reloading trends...
  ```

**Pass Criteria:** ✅ All training metrics update, sessions list refreshes

---

### **TEST 4: Baseline Page - All Metrics Visible (3 min)**

**Test Steps:**
1. Navigate to **My Baselines** page
2. Wait for data to load
3. Count the number of metric cards displayed

**Expected Behavior:**
- ✅ Should see **8 metric cards** (not just 1):
  1. **HRV** (Heart Rate Variability)
  2. **ACWR** (Acute:Chronic Workload Ratio)
  3. **EWMA** (Exponentially Weighted Moving Average)
  4. **MONOTONY** (Training Monotony)
  5. **STRAIN** (Training Strain)
  6. **TRAINING LOAD**
  7. **ACUTE LOAD**
  8. **CHRONIC LOAD**
- ✅ All metric names should be in **UPPERCASE** or **Title Case**
- ✅ Each card should show:
  - Baseline value
  - Current value
  - Deviation percentage
  - Risk status (Low/Moderate/High)

**If Only 1 Card Shows:**
- This means the baseline calculation hasn't run yet
- **Solution:** Trigger a manual Fitbit sync (Test 5 below)

**Pass Criteria:** ✅ 8 cards visible, proper capitalization, all data populated

---

### **TEST 5: Automated Pipeline - Full Sync Flow (10 min)**

**This is the MOST IMPORTANT TEST - it verifies the complete data pipeline**

**Pre-Test Setup:**
1. Open browser console (F12)
2. Clear console logs

**Test Steps:**
1. Navigate to **Settings** page
2. Find Fitbit Sync section
3. Click **"Sync Now"** button
4. Watch console logs for ~30 seconds
5. Navigate to **My Baselines** page

**Expected Console Logs (in order):**
```
[fitbit-sync] Starting sync...
[fitbit-sync] Fitbit data fetched successfully
[calc-trends] Trends calculated
[calc-trends] Triggering baseline calculation
[calculate-baseline] Baseline calculation started
[calculate-baseline] 8 baselines created
[calc-trends] Baseline triggered
[calc-trends] Triggering deviation calculation
[calculate-deviation] Deviation calculation started
[calculate-deviation] 8 deviations calculated
[calc-trends] Deviation triggered
```

**Expected Behavior:**
- ✅ Console shows full pipeline execution
- ✅ No errors in console
- ✅ My Baselines page shows all 8 metrics
- ✅ All metric cards update with fresh data

**Pass Criteria:** ✅ Full pipeline executes, 8 baselines + 8 deviations created

---

### **TEST 6: Plan Page - Mac Desktop Load (2 min)**

**Test Steps:**
1. Open app on **Mac/Desktop browser**
2. Navigate to **Your Plan** page
3. Wait for page to load

**Expected Behavior:**
- ✅ Page loads without crashing
- ✅ Weekly Insights section displays
- ✅ Avg Sleep metric shows a number (not "—" if data available)
- ✅ No JavaScript errors in console

**If Page Crashes/Doesn't Load:**
- Open console (F12)
- Look for error messages
- Take screenshot and report error

**Pass Criteria:** ✅ Plan page loads successfully on Mac, no errors

---

### **TEST 7: Real-Time Data Subscriptions (5 min)**

**Test Setup:**
1. Open Dashboard in **2 browser tabs** (Tab A and Tab B)

**Test Steps:**
1. In **Tab A**: Navigate to Settings → Click "Sync Now"
2. Switch to **Tab B**: Stay on Dashboard
3. Wait 10-15 seconds
4. Watch **Tab B** Dashboard metrics

**Expected Behavior:**
- ✅ **Tab B** automatically updates without refresh
- ✅ ACWR, Strain, Sleep Score values change
- ✅ No need to manually refresh the page

**Pass Criteria:** ✅ Real-time updates work across tabs

---

## 🗄️ Database Verification Queries

**Run these in Supabase SQL Editor to verify data integrity:**

### Query 1: Check User Baselines (Should return 8 records)
```sql
SELECT 
  metric, 
  rolling_avg, 
  data_window,
  updated_at
FROM user_baselines
ORDER BY metric;
```

**Expected:** 8 rows (acwr, acute_load, chronic_load, ewma, hrv, monotony, strain, training_load)

---

### Query 2: Check Yves Profiles (Should return 8 records)
```sql
SELECT 
  metric, 
  baseline_value, 
  current_value, 
  deviation_pct, 
  risk_status,
  updated_at
FROM yves_profiles
ORDER BY metric;
```

**Expected:** 8 rows with current risk assessments

---

### Query 3: Check Recent Trends (Should have all metric columns populated)
```sql
SELECT 
  date,
  user_id,
  acwr,
  strain,
  monotony,
  hrv,
  ewma,
  training_load,
  acute_load,
  chronic_load
FROM fitbit_trends
ORDER BY date DESC
LIMIT 7;
```

**Expected:** 7 days of data with all columns populated (not null)

---

### Query 4: Check Function Execution Logs
```sql
SELECT 
  function_name,
  status,
  duration_ms,
  metadata,
  completed_at
FROM function_execution_log
ORDER BY completed_at DESC
LIMIT 10;
```

**Expected:** Recent executions of calc-trends, calculate-baseline, calculate-deviation (all status='success')

---

## 📊 Edge Function Logs Verification

**Check in Supabase Dashboard → Functions → Logs:**

### 1. **calculate-baseline** Logs
Look for:
```
Starting baseline calculation...
Fetched X records for baseline calculation
Baseline calculation completed in Xms
```

**Expected:** `baselines_created: 8` in metadata

---

### 2. **calculate-deviation** Logs
Look for:
```
Starting deviation calculation...
Fetched X recent records
Deviation calculation completed in Xms
```

**Expected:** `deviations_calculated: 8` in metadata

---

### 3. **calc-trends** Logs (Netlify Functions)
Look for:
```
[calc-trends:start] { userId: '...' }
[calc-trends:calculated] { trendRecords: X }
[calc-trends:triggering-baseline] { userId: '...' }
[calc-trends:baseline-triggered] {}
[calc-trends:triggering-deviation] { userId: '...' }
[calc-trends:deviation-triggered] {}
[calc-trends:success] { records: X }
```

**Expected:** Full pipeline execution with no errors

---

## 🚨 Common Issues & Solutions

### Issue 1: Only 1 baseline showing (ACWR)
**Solution:** 
1. Manually trigger Fitbit sync from Settings
2. Wait 30 seconds for pipeline to complete
3. Check edge function logs for errors
4. Verify database has 8 records (Query 1 above)

---

### Issue 2: "Update Now" doesn't change metrics
**Solution:**
1. Check console for event listener logs
2. Verify Fitbit is connected (Settings page)
3. Try manual sync first, then Update Now
4. Check network tab for API calls

---

### Issue 3: Plan page crashes on Mac
**Solution:**
1. Check console for JavaScript errors
2. Verify `avgSleepScore` is not null in debugger
3. Clear browser cache and reload
4. Report error with screenshot

---

### Issue 4: Training metrics not updating
**Solution:**
1. Navigate to Dashboard, click "Update Now"
2. Wait 10 seconds, then go to Training page
3. Check console for "[Training] Fitbit data refreshed" log
4. Verify trends table has data (Query 3 above)

---

## ✅ Final Acceptance Checklist

- [ ] **Navigation:** All 10 tabs visible on desktop, 4 scrollable on mobile
- [ ] **Dashboard Update:** All 3 metrics update when clicking "Update Now"
- [ ] **Training Update:** Recent Sessions, Monotony, Strain all update
- [ ] **Baselines:** All 8 metrics visible with proper capitalization
- [ ] **Plan Page:** Loads on Mac without crashing
- [ ] **Database:** All 3 verification queries return correct row counts
- [ ] **Edge Functions:** Logs show successful pipeline execution
- [ ] **Real-Time:** Changes in one tab reflect in other tabs automatically

---

## 🎯 Success Criteria Summary

**All systems GO if:**
1. ✅ Bottom navigation shows all tabs responsively
2. ✅ "Update Now" updates Dashboard + Training metrics
3. ✅ My Baselines shows 8 metrics (not 1)
4. ✅ Plan page loads on Mac
5. ✅ Database queries return 8+ records each
6. ✅ Edge function logs show full pipeline execution
7. ✅ Real-time subscriptions work across tabs

**If any test fails, report:**
- Test number that failed
- Console error messages (screenshot)
- Database query results (screenshot)
- Edge function logs (screenshot)

---

## 📞 Debugging Commands

**Clear all cached data:**
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Force refresh all hooks:**
```javascript
// Run in browser console
window.dispatchEvent(new Event('fitbit_data_refreshed'));
window.dispatchEvent(new Event('fitbit_trends_refresh'));
```

**Test database connection:**
```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as total_trends FROM fitbit_trends;
SELECT COUNT(*) as total_baselines FROM user_baselines;
SELECT COUNT(*) as total_profiles FROM yves_profiles;
```

---

## 🎉 You're Done!

Once all tests pass, your app is fully functional with:
- ✅ Responsive navigation
- ✅ Real-time data updates
- ✅ Automated baseline/deviation calculation
- ✅ Comprehensive metric tracking
- ✅ Stable Plan page on all devices

**Happy testing! 🚀**
