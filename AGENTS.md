# AI Agent Context – Predictiv Health (PeakMovement/predictivmvp)

This document helps AI coding agents (Cursor, Claude, etc.) get up to speed on the project and collaborate effectively.

---

## Multi-Agent Collaboration

**You are not alone.** This codebase is edited by multiple AI agents:

| Agent | Role | Pushes to GitHub |
|-------|------|------------------|
| **Cursor** | Local development, reviews, refactors | Via user (manual or configured) |
| **Claude** | Feature work, fixes, deployments | Yes (automatic) |
| **Lovable** | UI prototyping (if used) | Yes (auto-commit) |

**GitHub:** [https://github.com/PeakMovement/predictivmvp](https://github.com/PeakMovement/predictivmvp)

Before making changes:
1. **Pull latest** – `git pull origin main` (Claude may have pushed)
2. **Check branch** – `main` and `feature/hyper-personalised-prompts` exist
3. **Commit message style** – Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`

---

## Project Overview

**Predictiv Health** is an AI-powered health optimization platform.

- **Frontend:** React 18 + TypeScript + Vite + Tailwind + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Edge Functions)
- **AI:** OpenAI GPT-4 via Edge Functions
- **Deploy:** Netlify (predictiv.netlify.app)
- **Integrations:** Oura Ring, Polar, Fitbit, Garmin, Google Calendar

### Core Features

- **Yves** – AI health assistant (daily briefings, chat, recommendations)
- **Wearable sync** – Oura, Polar, Fitbit, Garmin OAuth + data sync
- **Risk assessment** – Injury risk from training load & recovery
- **Treatment plans** – AI-generated plans, provider matching
- **Medical docs** – Upload and AI analysis
- **Dashboard** – Health metrics, baselines, insights tree

---

## Key Directories

```
src/
├── components/     # React components by feature
│   ├── dashboard/  # Dashboard cards, Yves UI
│   ├── yves/       # Yves chat, voice, memory
│   ├── oura/       # Oura-specific UI
│   ├── settings/   # Settings panels
│   └── ui/         # shadcn/ui primitives
├── hooks/          # Custom React hooks (useProfile, useWearableSessions, etc.)
├── pages/          # Route components
├── api/            # API clients (yves.ts, etc.)
├── lib/            # Utilities (metricsCalculator, timezone, etc.)
├── integrations/supabase/  # Supabase client + generated types
└── types/          # TypeScript types

supabase/
├── functions/      # Edge Functions (Deno)
│   ├── yves-chat/  # Yves AI chat
│   ├── fetch-oura-data/  # Oura sync
│   ├── generate-daily-briefing/
│   └── ...
└── migrations/     # SQL migrations
```

---

## Conventions

- **Components:** Functional components, hooks for logic
- **Styling:** Tailwind + shadcn, `@/` path alias
- **State:** React Query for server state, Context for UI
- **Tests:** Vitest (unit/component), Playwright (E2E)
- **Lint:** ESLint, strict TypeScript
- **Edge functions:** Deno, use `npm:` or `jsr:` for imports

---

## Essential Docs

| File | Purpose |
|------|---------|
| `DEVELOPER_README.md` | Full dev setup, env vars, testing |
| `QUICK_START.md` | Oura integration quick setup |
| `EDGE_FUNCTIONS.md` | Edge function API reference |
| `ARCHITECTURE.md` | System architecture |
| `TEST_DATA_SETUP.md` | Test data for development |

---

## Environment

- `.env` – Local env (gitignored). Copy from `.env.example` if present.
- Supabase secrets – Set via `supabase secrets set` for Edge Functions
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` – Required for frontend

---

## Quick Commands

```bash
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run test:run     # Run unit tests
npm run test:e2e     # Run E2E tests
npm run lint         # Lint
```

---

## Coordination Notes

- **Avoid merge conflicts:** Work in feature branches when possible.
- **Shared context:** This file and `.cursor/rules/` are the source of truth for AI context.
- **After Claude pushes:** Run `git pull` before starting new work.
- **Before pushing:** Run `npm run test:run && npm run lint && npm run build` to avoid breaking CI.

---

*Last updated: March 2026*
