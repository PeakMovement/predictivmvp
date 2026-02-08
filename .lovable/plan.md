

# Auto-Close Symptom Sheet After Low-Severity Interpretation

## Problem

When a user logs a low-severity symptom (no red flags, severity below 7), the AI interpretation runs and displays inside the sheet, but the sheet stays open indefinitely. The user has to manually dismiss it.

## Solution

After the AI interpretation finishes for a low-severity symptom, automatically close the sheet with a short delay so the user can briefly see the interpretation result before it slides away. A toast notification will confirm the symptom was logged and interpreted.

## How It Works

1. User logs a low-severity symptom
2. AI interpretation runs (loading spinner shows)
3. Interpretation result appears briefly (3-second delay)
4. Sheet auto-closes with a confirmation toast summarizing the key finding

The 3-second delay ensures the user sees the AI's response before the sheet disappears. If they want to review details later, the symptom history remains available.

## Technical Details

### File: `src/components/symptoms/SymptomCheckInSheet.tsx`

- Update `handleSuccess` to track when interpretation completes and trigger auto-close
- After `interpretSymptom` resolves (the `await` already exists), set a 3-second timeout to close the sheet
- Show a toast with the interpretation summary so the user doesn't lose the information
- Clear the timeout if the user manually closes the sheet or opens the professional referral flow

| File | Change |
|------|--------|
| `src/components/symptoms/SymptomCheckInSheet.tsx` | Add auto-close timer after interpretation completes, with toast summary |

