

# Light Mode: Silver-Toned Backgrounds with Stronger Text Contrast

## What Changes

The light mode palette gets two adjustments:

1. **Silver-toned backgrounds** -- The pure whites and cool grays shift to a subtle silver tone (slightly lower lightness, cool-neutral hue) so surfaces feel less stark and more refined.

2. **Darker, bolder text** -- All foreground/text colors move closer to true black so headings and body text pop crisply against the silver backdrop.

## Color Changes (all HSL)

| Token | Current | New | Purpose |
|-------|---------|-----|---------|
| `--background` | `220 14% 96%` | `220 10% 93%` | Page background: subtle silver instead of near-white |
| `--foreground` | `230 25% 18%` | `230 20% 8%` | Primary text: near-black for strong readability |
| `--card` | `0 0% 100%` | `220 10% 96%` | Card surfaces: light silver instead of pure white |
| `--card-foreground` | `230 25% 18%` | `230 20% 8%` | Card text: near-black |
| `--popover` | `0 0% 100%` | `220 10% 96%` | Popover surfaces: matching silver |
| `--popover-foreground` | `230 25% 18%` | `230 20% 8%` | Popover text: near-black |
| `--secondary` | `220 14% 93%` | `220 10% 90%` | Secondary surfaces: slightly deeper silver |
| `--secondary-foreground` | `230 25% 25%` | `230 20% 10%` | Secondary text: darker |
| `--muted` | `220 14% 93%` | `220 10% 90%` | Muted surfaces: matching secondary |
| `--muted-foreground` | `220 9% 46%` | `220 12% 36%` | Small/muted text: noticeably darker for legibility |
| `--glass-bg` | `0 0% 100% / 0.9` | `220 10% 96% / 0.92` | Glass panels: silver-tinted |
| `--glass-highlight` | `0 0% 100% / 0.8` | `220 8% 98% / 0.8` | Glass highlights: subtle warm silver |
| `--gradient-glass` | white-to-gray | silver-to-silver | Glass gradient: consistent silver palette |
| Body gradient | `hsl(220 14% 96%)` | `hsl(220 10% 93%)` | Body base matches new background |

## What Stays the Same

- Primary accent color (violet `252 56% 57%`) -- unchanged
- Border and input colors -- unchanged (already good contrast against silver)
- Dark mode -- completely untouched
- All component structure, layout, and animations -- no changes
- Design tokens for glow, ring, destructive -- unchanged

## Files Modified

| File | Change |
|------|--------|
| `src/index.css` | Update `.light` CSS variables and body gradient |

## Result

Text will appear noticeably crisper and more readable. Backgrounds will have a refined silver warmth instead of clinical white, creating a premium feel where the silver sits behind the text and lets it stand out clearly.

