

## Plan: Fix Scroll Issue + Fix Garmin Webhook Build Errors

### Problem: Can't Scroll

Two issues are preventing scrolling:

1. **`src/App.css` line 1-6**: The `#root` selector has `max-width: 1280px`, `padding: 2rem`, and `text-align: center` — this is leftover Vite boilerplate CSS that constrains the root container.

2. **`src/App.tsx` line 135**: The wrapper `div` has `overflow-x-hidden` which, combined with the `<main>` element in `AccessibilityWrapper.tsx`, can create scroll containment on some browsers/viewports. The fix is to keep `overflow-x-hidden` but ensure no `overflow-y` is being implicitly set to `auto`/`hidden`.

### Fix (2 files)

**1. `src/App.css`** — Remove the `#root` rule entirely (or clear it). It's Vite boilerplate that was never cleaned up. The `max-width`, `padding`, and `text-align: center` are actively harmful.

**2. `src/App.tsx` line 135** — Change `overflow-x-hidden` to `overflow-x-hidden overflow-y-auto` to explicitly allow vertical scrolling, even if a parent creates a new scroll context.

### Build Errors (separate issue)

The garmin-webhook TS errors and the `esm.sh` 521 errors are **Supabase Edge Function issues** — they don't affect the frontend build or the scrolling problem. The `esm.sh` 521 errors are transient CDN failures. The garmin-webhook type errors require changing function signatures to use `any` for the Supabase client parameter — but these are backend-only and don't block the app.

### Files to Edit
1. `src/App.css` — Remove `#root` boilerplate styles
2. `src/App.tsx` — Add explicit `overflow-y-auto` to wrapper div

