import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ── PREDICTIV. TYPOGRAPHY ─────────────────────────────────── */
      fontFamily: {
        display: ["'Cormorant Garamond'", "Georgia", "serif"],     // Hero titles, brand moments
        sans:    ["'Rajdhani'", "system-ui", "sans-serif"],         // Body, labels, nav, buttons
        mono:    ["'Space Mono'", "'Courier New'", "monospace"],    // Metrics, data, Yves, timestamps
      },

      /* ── PREDICTIV. COLOURS ────────────────────────────────────── */
      colors: {
        // Foundation
        void:    "#04040A",
        deep:    "#080812",
        surface: "#0D0D1E",
        panel:   "#12121F",
        lift:    "#1A1A2E",

        // Marble (typography)
        marble1: "#C8C2BE",
        marble2: "#E8E2DC",
        marble3: "#F5F0EB",
        pure:    "#FAFAF8",

        // Accents
        coldBlue:  "#A8C4D4",
        ice:       "#D0E8F5",
        bioGreen:  "#7ECBA1",
        amber:     "#D4956A",
        critical:  "#C46B6B",
        gold:      "#C9A96E",

        // Structural
        line: "rgba(200, 194, 190, 0.12)",
        glass: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          border:  "hsl(var(--glass-border))",
          highlight: "hsl(var(--glass-highlight))",
        },

        // Semantic (Tailwind / shadcn)
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT:             "hsl(var(--sidebar-background))",
          foreground:          "hsl(var(--sidebar-foreground))",
          primary:             "hsl(var(--sidebar-primary))",
          "primary-foreground":"hsl(var(--sidebar-primary-foreground))",
          accent:              "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border:              "hsl(var(--sidebar-border))",
          ring:                "hsl(var(--sidebar-ring))",
        },
      },

      /* ── PREDICTIV. SPACING ────────────────────────────────────── */
      spacing: {
        micro:   "4px",
        tight:   "8px",
        base:    "16px",
        relaxed: "24px",
        open:    "40px",
        breath:  "64px",
        vast:    "96px",
      },

      /* ── ZERO RADIUS — enforced globally ───────────────────────── */
      borderRadius: {
        lg:  "0",
        md:  "0",
        sm:  "0",
        DEFAULT: "0",
        xl:  "0",
        "2xl": "0",
        "3xl": "0",
        full: "9999px", // keep for avatar circles only
      },

      /* ── LETTER SPACING ────────────────────────────────────────── */
      letterSpacing: {
        data:    "0.15em",
        label:   "0.25em",
        eyebrow: "0.35em",
        nav:     "0.18em",
      },

      /* ── ANIMATIONS ────────────────────────────────────────────── */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: "0" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-slow": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "hairline-sweep": {
          "0%":   { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        "bar-grow": {
          "0%":   { transform: "scaleX(0)" },
          "100%": { transform: "scaleX(1)" },
        },
        "border-pulse": {
          "0%, 100%": { opacity: "0.2" },
          "50%":      { opacity: "0.6" },
        },
        "panel-enter": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down":   "accordion-down 0.2s ease-out",
        "accordion-up":     "accordion-up 0.2s ease-out",
        "fade-in":          "fade-in 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "fade-in-slow":     "fade-in-slow 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards",
        "hairline-sweep":   "hairline-sweep 1.2s linear infinite",
        "bar-grow":         "bar-grow 0.6s ease-out forwards",
        "border-pulse":     "border-pulse 6s ease-in-out infinite",
        "panel-enter":      "panel-enter 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
