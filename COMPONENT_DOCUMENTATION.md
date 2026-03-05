# Component Documentation Guide

This guide explains how to document React components in the Predictiv Health codebase.

## Table of Contents

- [Overview](#overview)
- [Documentation Standards](#documentation-standards)
- [JSDoc Format](#jsdoc-format)
- [Examples](#examples)
- [Component Categories](#component-categories)
- [Best Practices](#best-practices)

---

## Overview

All components should be documented using JSDoc comments. This documentation serves multiple purposes:
1. **Developer understanding**: Helps developers understand component purpose and usage
2. **IDE support**: Enables autocomplete and inline documentation in IDEs
3. **Maintenance**: Makes code easier to maintain and refactor
4. **Onboarding**: Helps new developers understand the codebase

---

## Documentation Standards

### Required Documentation

Every exported component must have:
1. **Component description**: What the component does
2. **Props documentation**: Description of each prop with type information
3. **Usage example**: Code example showing how to use the component
4. **Tags**: Relevant JSDoc tags (@component, @example, etc.)

### Optional Documentation

Consider adding:
1. **State description**: If component has complex internal state
2. **Side effects**: If component has side effects (API calls, etc.)
3. **Performance notes**: If component has performance considerations
4. **Accessibility notes**: ARIA labels, keyboard navigation, etc.

---

## JSDoc Format

### Component Block Comment

```typescript
/**
 * ComponentName
 *
 * Brief description of what the component does and its purpose.
 * Can span multiple lines for detailed explanations.
 *
 * @component
 * @example
 * ```tsx
 * <ComponentName
 *   prop1="value1"
 *   prop2={value2}
 *   onAction={handleAction}
 * />
 * ```
 *
 * @remarks
 * Additional notes about the component (optional):
 * - Performance considerations
 * - When to use this component
 * - Related components
 *
 * @see {@link RelatedComponent} for related functionality
 */
```

### Props Interface Documentation

```typescript
/**
 * Props for the ComponentName component
 */
interface ComponentNameProps {
  /** Brief description of prop1 */
  prop1: string;

  /**
   * Detailed description of prop2
   * Can span multiple lines with examples
   *
   * @example "example value"
   */
  prop2: number;

  /** Optional prop with default behavior description */
  prop3?: boolean;

  /** Callback function description including when it's called */
  onAction: (data: ActionData) => void;
}
```

### Complex Type Documentation

```typescript
/**
 * Data structure for health metrics
 */
interface HealthMetrics {
  /** Heart Rate Variability in milliseconds */
  hrv: number;

  /** Resting Heart Rate in beats per minute */
  rhr: number;

  /** Sleep quality score (0-100) */
  sleepScore: number;

  /** Training readiness score (0-100) */
  readiness: number;
}
```

---

## Examples

### Simple Component

```typescript
/**
 * LoadingSpinner Component
 *
 * Displays an animated loading spinner to indicate loading state.
 *
 * @component
 * @example
 * ```tsx
 * <LoadingSpinner size="lg" />
 * ```
 */
interface LoadingSpinnerProps {
  /** Size of the spinner - sm: 16px, md: 24px, lg: 32px */
  size?: 'sm' | 'md' | 'lg';

  /** Additional CSS classes to apply */
  className?: string;
}

export const LoadingSpinner = ({ size = 'md', className }: LoadingSpinnerProps) => {
  // Implementation
};
```

### Complex Component

```typescript
/**
 * DailyBriefingCard Component
 *
 * Displays the AI-generated daily health briefing from Yves with personalized insights,
 * health trends, recommendations, and context-aware information based on the user's focus mode.
 *
 * @component
 * @example
 * ```tsx
 * <DailyBriefingCard
 *   briefing={briefingData}
 *   content="Your sleep quality was excellent..."
 *   createdAt="2026-02-08T06:00:00Z"
 *   isLoading={false}
 *   isGenerating={false}
 *   cached={false}
 *   onRefresh={handleRefresh}
 *   focusMode="recovery"
 * />
 * ```
 *
 * @remarks
 * This component integrates with multiple data sources:
 * - Yves AI intelligence API for briefing generation
 * - Personal context data for tailored recommendations
 * - Health documents for relevant medical context
 * - Focus mode settings for content customization
 *
 * Performance notes:
 * - Caches briefings for 6 hours to reduce API calls
 * - Lazy loads document references on expand
 * - Debounces refresh button to prevent spam
 */
interface DailyBriefingCardProps {
  /** The complete briefing data object from Yves, or null if not yet loaded */
  briefing: YvesDailyBriefing | null;

  /** The main briefing content text, or null if not available */
  content: string | null;

  /** ISO timestamp of when the briefing was created */
  createdAt: string | null;

  /** Whether the initial briefing data is being loaded */
  isLoading: boolean;

  /** Whether a new briefing is currently being generated */
  isGenerating: boolean;

  /** Whether this briefing was served from cache */
  cached: boolean;

  /** Callback function to refresh/regenerate the briefing */
  onRefresh: () => void;

  /**
   * Optional focus mode that tailors the briefing content
   * - recovery: Emphasizes sleep, HRV, and recovery metrics
   * - performance: Focuses on training optimization
   * - pain_management: Highlights symptom tracking
   * - balance: Balanced view across all areas
   * - custom: Uses user-defined priorities
   */
  focusMode?: FocusMode;
}

export const DailyBriefingCard = (props: DailyBriefingCardProps) => {
  // Implementation
};
```

### Hook Documentation

```typescript
/**
 * useWearableSync Hook
 *
 * Manages synchronization of wearable device data (Oura, Polar, Fitbit).
 * Handles OAuth tokens, data fetching, and sync status.
 *
 * @hook
 * @example
 * ```tsx
 * const {
 *   isConnected,
 *   lastSync,
 *   syncNow,
 *   isSyncing
 * } = useWearableSync('oura');
 *
 * // Manually trigger sync
 * await syncNow();
 * ```
 *
 * @param source - Wearable device source ('oura' | 'polar' | 'fitbit')
 * @returns Sync state and control functions
 *
 * @remarks
 * - Automatically checks token expiration
 * - Retries failed syncs with exponential backoff
 * - Respects rate limits from wearable APIs
 */
export const useWearableSync = (source: WearableSource) => {
  // Implementation
};
```

### Utility Function Documentation

```typescript
/**
 * Calculate sleep quality score
 *
 * Computes a normalized sleep quality score (0-100) based on
 * sleep efficiency and duration.
 *
 * @param efficiency - Sleep efficiency percentage (0-100)
 * @param durationMinutes - Total sleep duration in minutes
 * @returns Sleep score (0-100)
 *
 * @example
 * ```typescript
 * const score = calculateSleepScore(90, 480);
 * // Returns: 93 (excellent sleep)
 * ```
 *
 * @remarks
 * Formula: efficiency × 0.7 + min(duration/480, 1) × 30
 * - Efficiency is weighted 70%
 * - Duration is capped at 8 hours (480 minutes)
 * - Duration is weighted 30%
 */
export const calculateSleepScore = (
  efficiency: number,
  durationMinutes: number
): number => {
  const durationHours = durationMinutes / 60;
  const durationScore = Math.min(durationHours / 8, 1);
  return Math.round(efficiency * 0.7 + durationScore * 30);
};
```

---

## Component Categories

### UI Components (src/components/ui/)

Basic, reusable UI components. Documentation should focus on:
- Visual appearance and variants
- Accessibility features
- Available props and customization
- Usage with other components

Example: Button, Card, Dialog, Input

### Feature Components (src/components/dashboard/, src/components/health/, etc.)

Business logic components. Documentation should focus on:
- Business purpose and use case
- Data requirements and sources
- User interactions and flows
- Integration points

Example: DailyBriefingCard, RiskScoreCard, SymptomCheckInForm

### Layout Components (src/components/layout/)

Layout and structure components. Documentation should focus on:
- Layout behavior and responsive design
- Child component requirements
- Grid/flexbox usage
- Accessibility considerations

Example: Sidebar, Header, BottomNavigation

### Integration Components (src/components/oura/, src/components/polar/)

Third-party integration components. Documentation should focus on:
- External API dependencies
- OAuth flow and authentication
- Error handling and edge cases
- Rate limiting considerations

Example: OuraSyncStatus, PolarAuthButton

---

## Best Practices

### DO:

1. **Write clear, concise descriptions**
   ```typescript
   /** Displays user's daily health briefing with AI insights */
   ```

2. **Include realistic examples**
   ```typescript
   @example
   ```tsx
   <HealthMetricsCard
     hrv={65}
     rhr={58}
     sleepScore={85}
   />
   ```
   ```

3. **Document edge cases and limitations**
   ```typescript
   /**
    * @remarks
    * - Returns null if user has no wearable connected
    * - Caches data for 5 minutes to reduce API calls
    * - Requires authentication
    */
   ```

4. **Use TypeScript types effectively**
   ```typescript
   /** Heart rate in beats per minute (40-220 typical range) */
   heartRate: number;
   ```

5. **Link related components**
   ```typescript
   /** @see {@link RiskScoreCard} for detailed risk assessment */
   ```

6. **Document performance considerations**
   ```typescript
   /**
    * @remarks
    * Performance: This component memoizes expensive calculations.
    * Re-renders only when props.data changes.
    */
   ```

### DON'T:

1. **Don't state the obvious**
   ```typescript
   // Bad: /** prop1 is a string */
   // Good: /** User's email address for notifications */
   ```

2. **Don't document internal implementation**
   ```typescript
   // Bad: /** Uses useState hook to manage state */
   // Good: /** Manages form validation state internally */
   ```

3. **Don't use generic descriptions**
   ```typescript
   // Bad: /** This component renders something */
   // Good: /** Displays daily health metrics in a card layout */
   ```

4. **Don't skip prop documentation**
   ```typescript
   // Bad:
   interface Props {
     data: any; // Undocumented
   }

   // Good:
   interface Props {
     /** Health metrics data from the past 7 days */
     data: HealthMetrics[];
   }
   ```

5. **Don't ignore accessibility**
   ```typescript
   // Bad: Missing ARIA documentation
   // Good:
   /**
    * @remarks
    * Accessibility:
    * - Includes ARIA labels for screen readers
    * - Keyboard navigable with Tab and Enter keys
    * - Follows WCAG 2.1 AA standards
    */
   ```

---

## Documentation Checklist

When documenting a component, ensure you have:

- [ ] Component-level JSDoc block with description
- [ ] `@component` tag
- [ ] `@example` with realistic usage code
- [ ] Props interface with JSDoc comments for each prop
- [ ] Return type documented (if applicable)
- [ ] Edge cases and limitations documented in `@remarks`
- [ ] Related components linked with `@see`
- [ ] Performance notes (if relevant)
- [ ] Accessibility notes (if relevant)
- [ ] Examples that actually work and can be copy-pasted

---

## Generating Documentation

### Using TypeDoc

Generate HTML documentation from JSDoc comments:

```bash
# Install TypeDoc
npm install -D typedoc

# Generate docs
npx typedoc --out docs src/components
```

### Using Storybook

Create interactive component documentation:

```bash
# Install Storybook
npx storybook@latest init

# Run Storybook
npm run storybook
```

Create a story file:

```typescript
// src/components/MyComponent.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { MyComponent } from './MyComponent';

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof MyComponent>;

export const Default: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};
```

---

## Review Process

When reviewing component documentation:

1. **Completeness**: Are all public APIs documented?
2. **Clarity**: Can a new developer understand the component?
3. **Accuracy**: Is the documentation up-to-date with code?
4. **Examples**: Do the examples actually work?
5. **Types**: Are TypeScript types properly documented?
6. **Links**: Are related components/functions linked?

---

## Maintenance

### Keeping Documentation Updated

1. **Update docs with code changes**: When changing a component's behavior, update its documentation
2. **Review during PRs**: Check that documentation is updated in pull requests
3. **Periodic audits**: Review documentation quarterly for accuracy
4. **Remove outdated info**: Delete documentation for removed features
5. **Validate examples**: Test that examples still work

### Documentation Debt

Track documentation improvements needed:

```typescript
/**
 * MyComponent
 *
 * TODO: Add usage examples
 * TODO: Document accessibility features
 * TODO: Add performance notes for large datasets
 */
```

---

## Additional Resources

### JSDoc
- [JSDoc Reference](https://jsdoc.app/)
- [TypeScript JSDoc Reference](https://www.typescriptlang.org/docs/handbook/jsdoc-supported-types.html)

### Component Documentation Tools
- [Storybook](https://storybook.js.org/)
- [TypeDoc](https://typedoc.org/)
- [Docusaurus](https://docusaurus.io/)

### Style Guides
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)

---

**Last Updated**: February 2026
**Maintained By**: Predictiv Health Development Team
