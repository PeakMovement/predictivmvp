

# Auto-Close Symptom Sheet on "Find a Professional"

## Problem

After logging a symptom with red-flag keywords or high severity (7+), a dialog appears asking "Would you like us to help you find a professional?" Clicking "Yes, find help" navigates to the Help tab but the Symptom Check-In sheet stays open, blocking the view.

## Solution

Pass a close callback from the Sheet into the Form so the sheet closes automatically when the user clicks "Yes, find help."

## Changes

### 1. SymptomCheckInForm (`src/components/symptoms/SymptomCheckInForm.tsx`)

- Add an optional `onRequestClose` prop to the component interface
- Call `onRequestClose()` inside `handleFindProfessional` right before dispatching the `navigate-tab` event

### 2. SymptomCheckInSheet (`src/components/symptoms/SymptomCheckInSheet.tsx`)

- Pass `onRequestClose={() => setOpen(false)}` to the `SymptomCheckInForm` component

This is a minimal two-line change that cleanly closes the sheet before navigating to the Help tab, giving the user a seamless transition from symptom logging to finding a professional.

## Technical Details

| File | Change |
|------|--------|
| `src/components/symptoms/SymptomCheckInForm.tsx` | Add `onRequestClose?: () => void` prop, call it in `handleFindProfessional` |
| `src/components/symptoms/SymptomCheckInSheet.tsx` | Pass `onRequestClose={() => setOpen(false)}` to `SymptomCheckInForm` |

