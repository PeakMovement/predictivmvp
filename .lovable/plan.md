

## Fix: Persistent Alert Dismissal for Training Monotony Alert

### Problem
The "Health Check" / "Training Monotony Alert" keeps reappearing because:
1. The "Got it" button only clears in-memory state -- it does not set a durable cooldown
2. The localStorage cooldown set on first display gets wiped when the preview reloads
3. The user's monotony value genuinely exceeds the 2.2 threshold, so the alert re-triggers on every page load

### Solution
Store alert dismissals in the Supabase database instead of (only) localStorage, so they survive across sessions, devices, and preview rebuilds.

### Implementation Steps

**Step 1 -- Create a `risk_alert_dismissals` table**
- Columns: `id`, `user_id`, `alert_key` (e.g., "Monotony_high_risk"), `dismissed_at`, `snooze_until`
- RLS: users can only read/write their own rows
- The hook will check this table before showing any alert

**Step 2 -- Update `useRiskAlertTrigger` hook**
- On alert check: query `risk_alert_dismissals` for the current user and alert key
- If a row exists where `snooze_until > now()` OR `dismissed_at` is within the last 7 days, skip the alert
- Keep localStorage as a fast local cache to avoid unnecessary DB queries on every load

**Step 3 -- Update `dismissAlert` to persist**
- When "Got it" is clicked, insert/upsert a row into `risk_alert_dismissals` with `dismissed_at = now()` and `snooze_until = now + 7 days`
- When a snooze duration is selected, set `snooze_until` to the appropriate future time

**Step 4 -- Update `RiskAlertPopup` component**
- Pass the user ID down so the dismiss/snooze handlers can write to the database
- No visual changes needed

### Technical Details

```text
risk_alert_dismissals table:
+----------+---------+-----------+--------------+---------------+
| id (uuid)| user_id | alert_key | dismissed_at | snooze_until  |
+----------+---------+-----------+--------------+---------------+
```

The `checkForAlerts` function will add a DB check early in the flow:
```text
1. Get user
2. Query risk_alert_dismissals WHERE user_id = user AND alert_key = key
3. If snooze_until > now → skip
4. If dismissed_at within 7 days → skip
5. Otherwise → show alert as normal
```

The `dismissAlert` function will change from just `setCurrentAlert(null)` to also upserting a dismissal record.

### What This Fixes
- Alert will NOT reappear after clicking "Got it" -- even across page reloads and rebuilds
- Snooze durations will be respected persistently
- No changes to the visual UI

