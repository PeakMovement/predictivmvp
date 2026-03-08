

# Fix: BookingDialog Layout + MyBaselines Build Error

## Two issues to address:

### 1. BookingDialog layout cleanup (FindHelp.tsx, lines 358-397)
Replace the current stacked layout with inline action buttons:
- Remove the large full-width "Call Now" button
- Replace the phone/email rows inside the bordered box with two compact inline buttons: a "Call" button (`href=tel:`) and an "Email" button (`href=mailto:`)
- Use `Button` with `size="sm"` and `variant="outline"` side by side in a flex row
- Keep the helpful tip text below

### 2. MyBaselines build error (MyBaselines.tsx, line 276/286)
The `training_load` column doesn't exist on `wearable_sessions`. Fix:
- Remove `training_load` from the select query (line 276)
- Remove `training_load` from the `SessionRow` interface (line 26)
- Update any references to `training_load` in the rest of the file (metric cards, charts)

