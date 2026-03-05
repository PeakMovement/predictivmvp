# Developer README - Predictiv Health Platform

Welcome to the Predictiv Health Platform! This document provides comprehensive information for developers working on the project.

## Table of Contents

- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Project Overview

Predictiv Health is an AI-powered health optimization platform that integrates wearable data (Oura Ring, Polar, Fitbit) to provide personalized health insights, risk assessment, and actionable recommendations.

### Key Features

- **AI Health Assistant (Yves)**: Personalized daily briefings and intelligent health coaching
- **Wearable Integration**: Connect Oura Ring, Polar, and Fitbit devices
- **Risk Assessment**: Calculate injury risk based on training load and recovery metrics
- **Medical Records**: Upload and AI-analyze medical documents
- **Provider Matching**: Find healthcare providers based on symptoms and needs
- **Training Optimization**: Track workouts and optimize training load

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Testing**: Vitest (unit/component) + Playwright (E2E)
- **AI/ML**: OpenAI GPT-4 (via Supabase Edge Functions)
- **State Management**: React Query + Context API

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │ Dashboard  │  │   Health   │  │  Wearable Sync    │   │
│  │  (Yves)    │  │  Tracking  │  │  (Oura/Polar)     │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │ PostgreSQL │  │   Edge     │  │     Storage       │   │
│  │    RLS     │  │ Functions  │  │   (Documents)     │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  External Integrations                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │  Oura API  │  │  Polar API │  │    OpenAI API     │   │
│  └────────────┘  └────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication**: Supabase Auth with email/password
2. **Wearable OAuth**: OAuth 2.0 flow for wearable device connections
3. **Data Sync**: Scheduled edge functions fetch wearable data
4. **AI Processing**: Edge functions process data through OpenAI
5. **Frontend Display**: React components render personalized insights

### Key Design Patterns

- **Component-Based Architecture**: Modular, reusable React components
- **Custom Hooks**: Business logic encapsulated in hooks (see `src/hooks/`)
- **Row Level Security (RLS)**: Database security at the row level
- **Edge Functions**: Serverless functions for backend logic
- **Progressive Enhancement**: Works offline with service workers

---

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Supabase Account**: For backend services
- **Git**: For version control

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd predictiv-health
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   Open [http://localhost:5173](http://localhost:5173) in your browser

### First-Time Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Copy your project credentials** to `.env`
3. **Run database migrations** (automatic on first deploy)
4. **Set up OAuth apps** for wearable integrations
5. **Configure OpenAI API key** in Supabase secrets

---

## Environment Variables

### Required Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Wearable Integration
VITE_OURA_CLIENT_ID=your-oura-client-id
VITE_OURA_REDIRECT_URI=http://localhost:5173/oauth/callback/oura

VITE_POLAR_CLIENT_ID=your-polar-client-id
VITE_POLAR_REDIRECT_URI=http://localhost:5173/oauth/callback/polar

VITE_FITBIT_CLIENT_ID=your-fitbit-client-id
VITE_FITBIT_REDIRECT_URI=http://localhost:5173/oauth/callback/fitbit
```

### Server-Side Variables (Supabase Secrets)

These are configured in Supabase Dashboard → Settings → Edge Functions:

```env
# AI Configuration
OPENAI_API_KEY=sk-...

# Wearable API Secrets
OURA_CLIENT_SECRET=your-oura-secret
POLAR_CLIENT_SECRET=your-polar-secret
FITBIT_CLIENT_SECRET=your-fitbit-secret

# Email Configuration (optional)
RESEND_API_KEY=re_...

# SMS Configuration (optional)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
```

### How to Get API Keys

#### Oura Ring API
1. Visit [cloud.ouraring.com](https://cloud.ouraring.com)
2. Create a developer account
3. Register your application
4. Copy Client ID and Client Secret

#### Polar API
1. Visit [https://admin.polaraccesslink.com](https://admin.polaraccesslink.com)
2. Create an account
3. Create a new client
4. Copy Client ID and Client Secret

#### Fitbit API
1. Visit [dev.fitbit.com](https://dev.fitbit.com)
2. Register an application
3. Set OAuth 2.0 Application Type to "Personal"
4. Copy Client ID and Client Secret

#### OpenAI API
1. Visit [platform.openai.com](https://platform.openai.com)
2. Create an account
3. Navigate to API Keys
4. Create a new secret key

---

## Project Structure

```
predictiv-health/
├── public/                      # Static assets
├── src/
│   ├── __tests__/              # Test files
│   │   ├── lib/                # Unit tests for utilities
│   │   └── components/         # Component tests
│   ├── api/                    # API client functions
│   ├── components/             # React components
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── ui/                 # Reusable UI components (shadcn)
│   │   ├── admin/              # Admin panel components
│   │   ├── alerts/             # Alert and notification components
│   │   ├── canvas/             # Personal canvas components
│   │   ├── documents/          # Document management components
│   │   ├── health/             # Health tracking components
│   │   ├── help/               # Provider matching components
│   │   ├── oura/               # Oura-specific components
│   │   ├── planner/            # Planning and scheduling components
│   │   ├── settings/           # Settings components
│   │   ├── symptoms/           # Symptom tracking components
│   │   ├── training/           # Training management components
│   │   └── yves/               # Yves AI assistant components
│   ├── hooks/                  # Custom React hooks
│   ├── integrations/           # Third-party integrations
│   │   └── supabase/           # Supabase client and types
│   ├── lib/                    # Utility functions
│   ├── pages/                  # Page components (routes)
│   ├── test/                   # Test utilities and mocks
│   └── types/                  # TypeScript type definitions
├── supabase/
│   ├── functions/              # Edge functions (serverless)
│   │   ├── _shared/            # Shared utilities for edge functions
│   │   ├── yves-chat/          # Yves AI chat endpoint
│   │   ├── fetch-oura-data/    # Oura data sync
│   │   └── [other-functions]/  # Additional edge functions
│   └── migrations/             # Database migrations
├── e2e/                        # End-to-end tests
├── ARCHITECTURE.md             # Detailed architecture documentation
├── TESTING_INFRASTRUCTURE.md   # Testing guide
├── EDGE_FUNCTIONS.md           # Edge functions documentation
└── package.json                # Dependencies and scripts
```

### Key Directories

- **`src/components/`**: All React components, organized by feature
- **`src/hooks/`**: Custom hooks for business logic
- **`src/lib/`**: Utility functions (sanitization, calculations, etc.)
- **`supabase/functions/`**: Serverless edge functions
- **`supabase/migrations/`**: Database schema migrations

---

## Development Workflow

### Running the Development Server

```bash
npm run dev
```

This starts:
- Vite dev server on port 5173
- Hot module replacement (HMR) for instant updates
- TypeScript type checking

### Building for Production

```bash
npm run build
```

Output is generated in the `dist/` directory.

### Linting

```bash
npm run lint
```

Runs ESLint to check code quality and style.

### Code Formatting

We use Prettier (configured via ESLint):

```bash
npm run lint -- --fix
```

### Git Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

3. **Push and create a pull request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Build process or auxiliary tool changes

---

## Testing

### Running Tests

```bash
# Unit and component tests
npm test                    # Watch mode
npm run test:run           # Run once
npm run test:coverage      # With coverage report
npm run test:ui            # Open Vitest UI

# End-to-end tests
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Open Playwright UI
npm run test:e2e:headed    # Run with browser visible
npm run test:e2e:debug     # Debug mode
```

### Writing Tests

#### Unit Tests

```typescript
// src/__tests__/lib/myFunction.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/lib/myModule';

describe('myFunction', () => {
  it('should handle normal input', () => {
    expect(myFunction('test')).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('');
  });
});
```

#### Component Tests

```typescript
// src/__tests__/components/MyComponent.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/testUtils';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

#### E2E Tests

```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test('should complete user flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByText('Success')).toBeVisible();
});
```

### Coverage Goals

- **Unit Tests**: 70% minimum, currently ~85%
- **Component Tests**: 70% minimum, currently ~78%
- **E2E Tests**: Critical user flows covered

See [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md) for detailed testing guide.

---

## Deployment

### Deploying to Production

The application is deployed to Netlify with automatic deployments on push to `main`:

1. **Push to main branch**:
   ```bash
   git push origin main
   ```

2. **Netlify builds automatically**:
   - Runs `npm run build`
   - Deploys to CDN
   - Updates preview URL

### Supabase Edge Functions

Deploy edge functions manually:

```bash
# Deploy all functions
for func in supabase/functions/*; do
  supabase functions deploy $(basename $func)
done

# Deploy specific function
supabase functions deploy yves-chat
```

### Environment Variables in Production

Set in Netlify:
- Dashboard → Site Settings → Environment Variables
- Add all `VITE_*` variables from `.env`

Set in Supabase:
- Dashboard → Settings → Edge Functions → Secrets
- Add server-side secrets (API keys, etc.)

### Database Migrations

Migrations are applied automatically on deployment. To apply manually:

```bash
supabase db push
```

---

## Troubleshooting

### Common Issues

#### 1. "Module not found" errors

**Problem**: Import path is incorrect or module is not installed.

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Check import paths use @ alias
import { Component } from '@/components/Component'
```

#### 2. Supabase connection fails

**Problem**: Environment variables are not set correctly.

**Solution**:
1. Check `.env` file exists and has correct values
2. Restart dev server after changing `.env`
3. Verify Supabase project URL and anon key

```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/
```

#### 3. Oura OAuth callback fails

**Problem**: Redirect URI mismatch or missing scopes.

**Solution**:
1. Verify redirect URI in Oura dashboard matches exactly
2. Check required scopes are enabled:
   - `daily`
   - `heartrate`
   - `workout`
   - `session`
   - `tag`
   - `personal`
3. Clear browser cookies and try again

#### 4. TypeScript errors after update

**Problem**: Type definitions are outdated.

**Solution**:
```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id your-project-id > src/integrations/supabase/types.ts

# Clear TypeScript cache
rm -rf node_modules/.vite
npm run dev
```

#### 5. Tests failing with "Cannot find module"

**Problem**: Test setup or path aliases not configured.

**Solution**:
1. Check `vitest.config.ts` has correct path aliases
2. Verify `src/test/setup.ts` is running
3. Clear test cache:
   ```bash
   npx vitest run --clearCache
   ```

#### 6. Edge function deployment fails

**Problem**: Function has syntax errors or missing dependencies.

**Solution**:
1. Test function locally:
   ```bash
   supabase functions serve function-name
   ```
2. Check function logs:
   ```bash
   supabase functions logs function-name
   ```
3. Verify all imports use `npm:` or `jsr:` prefix

#### 7. Build fails with "out of memory"

**Problem**: Large bundle size exceeds memory limit.

**Solution**:
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build

# Analyze bundle size
npm run build -- --analyze
```

#### 8. CORS errors in development

**Problem**: API requests blocked by CORS policy.

**Solution**:
1. Ensure edge functions include CORS headers
2. Check `Access-Control-Allow-Origin` is set to `*` in development
3. Verify `Access-Control-Allow-Headers` includes required headers

### Getting Help

1. **Check documentation**: Review relevant `.md` files in project root
2. **Search issues**: Look for similar issues in the issue tracker
3. **Ask the team**: Post in team chat with error details
4. **Create an issue**: If it's a bug, create a detailed issue report

### Debugging Tips

#### Enable Verbose Logging

```typescript
// In Supabase client
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
});
```

#### Debug Edge Functions

```bash
# View function logs in real-time
supabase functions logs function-name --tail

# Test function locally
supabase functions serve function-name
curl http://localhost:54321/functions/v1/function-name
```

#### Debug React Components

```typescript
// Add console logs
console.log('Component rendered', { props, state });

// Use React DevTools
// Install: https://react.dev/learn/react-developer-tools
```

#### Debug Tests

```bash
# Run specific test file
npm test src/__tests__/lib/utils.test.ts

# Debug in VS Code
# Add breakpoint and use "Debug Test" in test file
```

---

## Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **React**: Functional components with hooks
- **Naming**: camelCase for variables, PascalCase for components
- **Comments**: JSDoc for public APIs, inline for complex logic
- **Formatting**: Prettier via ESLint

### Best Practices

1. **Use TypeScript types**: Avoid `any`
2. **Write tests**: Unit tests for utilities, component tests for UI
3. **Keep components small**: Single responsibility principle
4. **Use custom hooks**: Extract business logic from components
5. **Follow security best practices**: Sanitize inputs, use RLS
6. **Document changes**: Update relevant `.md` files

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear commits
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run tests and linting**:
   ```bash
   npm run test:run
   npm run lint
   npm run build
   ```
6. **Create a pull request** with a clear description
7. **Request review** from team members
8. **Address feedback** and merge when approved

### Code Review Checklist

- [ ] Code follows style guide
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No console.logs in production code
- [ ] Environment variables are documented
- [ ] Security best practices followed
- [ ] Performance considerations addressed

---

## Additional Resources

### Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed system architecture
- [TESTING_INFRASTRUCTURE.md](./TESTING_INFRASTRUCTURE.md) - Testing guide
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Edge functions API documentation
- [SECURITY.md](./SECURITY.md) - Security best practices
- [DATA_FLOW.md](./DATA_FLOW.md) - Data flow diagrams

### External Documentation

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)

### API References

- [Oura API](https://cloud.ouraring.com/docs/)
- [Polar API](https://www.polar.com/accesslink-api/)
- [Fitbit API](https://dev.fitbit.com/build/reference/web-api/)
- [OpenAI API](https://platform.openai.com/docs/api-reference)

---

## License

Copyright © 2026 Predictiv Health. All rights reserved.

---

**Last Updated**: February 2026
**Maintained By**: Predictiv Health Development Team
