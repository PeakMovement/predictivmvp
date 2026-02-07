

# Fix Dark Mode and Light Mode Colors and Borders

## Problems Identified

After reviewing the entire design system, here's what's causing the readability issues:

### Dark Mode Issues
1. **Invisible borders**: The border color (`30 6% 16%`) is almost identical to the background (`30 8% 6%`) -- only a 10% lightness difference, making card outlines nearly invisible.
2. **Cards blend into the background**: `--card` is set to the exact same value as `--background` (`30 8% 6%`), so cards have zero visual separation from the page.
3. **Glass borders too transparent**: `--glass-border` uses `0.2` opacity, which is barely visible on the dark background.
4. **Hardcoded dark colors**: The bottom navigation uses a hardcoded `bg-[#0A0A0A]/90` that ignores the theme system entirely.
5. **Login page uses hardcoded hex values** (`#0B0B0F`, `#111`, `border-gray-800`) instead of design tokens.

### Light Mode Issues
1. **Background is too bright/white**: `45 30% 96%` is essentially pure white with a warm tint -- not enough warmth to feel like "eggshell."
2. **Body gradient ignores light mode**: The body background uses hardcoded dark HSL values (`hsl(30 8% 6%)`) which don't switch in light mode, causing a jarring mismatch.
3. **Cards nearly invisible on background**: Card (`45 35% 97%`) is almost the same as background (`45 30% 96%`) -- only 1% lightness difference.
4. **Borders too light**: `35 15% 85%` barely registers against the near-white background.
5. **Text utility classes hardcoded**: `.text-heading` is `#FFFFFF` (white) which is invisible in light mode.

### Shared Issues
- The global `*` transition rule (300ms on all properties) applies to everything, which can cause visual lag and performance issues.
- Several components use `border-0` on cards, removing the border entirely.

## What Will Change

### 1. Dark Mode -- Warmer, More Defined (`index.css`)

| Token | Current | New | Why |
|-------|---------|-----|-----|
| `--card` | `30 8% 6%` (same as bg) | `30 8% 10%` | Cards lift off the background |
| `--border` | `30 6% 16%` | `30 8% 22%` | Borders become visible |
| `--input` | `30 6% 16%` | `30 8% 18%` | Input fields stand out |
| `--glass-border` | `35 8% 50% / 0.2` | `35 10% 60% / 0.3` | Glass edges more defined |
| `--glass-highlight` | `40 20% 95% / 0.1` | `40 20% 95% / 0.15` | Subtle hover lift |
| `--secondary` | `30 6% 14%` | `30 8% 14%` | Slightly warmer |
| `--muted` | `30 6% 14%` | `30 8% 14%` | Slightly warmer |

### 2. Light Mode -- Softer, More Readable (`index.css`)

| Token | Current | New | Why |
|-------|---------|-----|-----|
| `--background` | `45 30% 96%` | `40 25% 93%` | Warmer, not harsh white |
| `--card` | `45 35% 97%` | `42 30% 97%` | Cards clearly float above background |
| `--popover` | `45 35% 97%` | `42 30% 97%` | Consistent with card |
| `--border` | `35 15% 85%` | `35 15% 78%` | Borders visible against warm bg |
| `--input` | `35 15% 85%` | `35 15% 80%` | Input fields stand out |
| `--glass-border` | `35 15% 80%` | `35 12% 72%` | Glass edges visible |
| `--secondary` | `45 20% 92%` | `40 18% 89%` | More contrast with background |
| `--muted` | `40 15% 90%` | `38 14% 87%` | More contrast with background |

### 3. Body Background -- Theme-Aware (`index.css`)

The body gradient currently uses hardcoded dark values. I'll add a `.light body` override so light mode gets a soft warm gradient instead of the dark charcoal one.

### 4. Hardcoded Colors Cleanup

- **BottomNavigation.tsx**: Replace `bg-[#0A0A0A]/90` with `bg-background/90`
- **Login.tsx**: Replace `bg-[#0B0B0F]`, `bg-[#111]`, `border-gray-800` with design tokens
- **index.css utility classes**: Make `.text-heading`, `.text-subtext`, `.text-muted-predictiv` use `hsl(var(--foreground))` style tokens instead of hardcoded hex

### 5. Card Border Visibility

- **PrimaryInsightCard.tsx**: Replace `border-0` with `border border-border/50` so cards have visible outlines
- **CondensedSessionCard.tsx**: Already has `border border-border/50` -- no change needed
- Keep the `border-glass-border` pattern on glass cards, but the updated glass-border value will make them visible

## Files Changed

| File | Change |
|------|--------|
| `src/index.css` | Update dark/light CSS variables, add light-mode body gradient, fix utility text classes |
| `src/components/BottomNavigation.tsx` | Replace hardcoded `#0A0A0A` with `bg-background/90` |
| `src/pages/Login.tsx` | Replace hardcoded hex colors with design tokens |
| `src/components/landing/PrimaryInsightCard.tsx` | Replace `border-0` with subtle border |

## What Won't Change

- The dusty violet primary accent color stays the same
- The warm charcoal "feel" of dark mode stays -- just better contrast
- The eggshell "feel" of light mode stays -- just less blinding
- All existing component layouts and functionality remain untouched
- The glassmorphism design language is preserved, just more visible

