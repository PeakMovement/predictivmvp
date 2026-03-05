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
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        glass: {
          DEFAULT: "hsl(var(--glass-bg))",
          border: "hsl(var(--glass-border))",
          highlight: "hsl(var(--glass-highlight))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "glow-pulse": {
          "0%, 100%": {
            opacity: "1",
            transform: "scale(1)",
            filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.4))",
          },
          "50%": {
            opacity: "0.9",
            transform: "scale(1.02)",
            filter: "drop-shadow(0 0 12px hsl(var(--primary) / 0.6))",
          },
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)",
          },
          "50%": {
            transform: "translateY(-2px)",
          },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px) scale(0.95)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0px) scale(1)",
          },
        },
        "fade-in-slow": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px) scale(0.9)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0px) scale(1)",
          },
        },
        "slide-in": {
          "0%": {
            opacity: "0",
            transform: "translateX(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0px)",
          },
        },
        "bounce-subtle": {
          "0%, 100%": {
            transform: "translateY(-2%)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
        "shimmer": {
          "0%": {
            backgroundPosition: "-200% 0",
          },
          "100%": {
            backgroundPosition: "200% 0",
          },
        },
        "gauge-fill": {
          "0%": {
            strokeDashoffset: "100",
          },
          "100%": {
            strokeDashoffset: "var(--gauge-value)",
          },
        },
        "bar-grow": {
          "0%": {
            transform: "scaleX(0)",
            opacity: "0",
          },
          "100%": {
            transform: "scaleX(1)",
            opacity: "1",
          },
        },
        "number-pop": {
          "0%": {
            transform: "scale(0.8)",
            opacity: "0",
          },
          "50%": {
            transform: "scale(1.1)",
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1",
          },
        },
        "panel-enter": {
          "0%": {
            opacity: "0",
            transform: "translateY(16px) scale(0.96)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0) scale(1)",
          },
        },
        "pulse-ring": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "1",
          },
          "100%": {
            transform: "scale(1.5)",
            opacity: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "fade-in-slow": "fade-in-slow 0.8s ease-out forwards",
        "slide-in": "slide-in 0.4s ease-out forwards",
        "bounce-subtle": "bounce-subtle 2s infinite",
        "shimmer": "shimmer 2s linear infinite",
        "gauge-fill": "gauge-fill 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "bar-grow": "bar-grow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "number-pop": "number-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "panel-enter": "panel-enter 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "pulse-ring": "pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      boxShadow: {
        "glow": "0 0 20px hsl(var(--glow-primary) / 0.5)",
        "glow-lg": "0 0 40px hsl(var(--glow-primary) / 0.4)",
        "glass": "0 8px 32px rgba(0, 0, 0, 0.37)",
      },
      backdropBlur: {
        "xs": "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
