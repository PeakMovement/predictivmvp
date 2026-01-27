
# Revised Plan: Fix Repetitive "Today's Best Decision" Content

## Your Feedback Incorporated

| Requirement | How It Will Be Addressed |
|-------------|-------------------------|
| **Local date for rotation** | Use `new Date().toLocaleDateString('en-CA')` to get YYYY-MM-DD in user's local timezone |
| **User-scoped cache key** | Prefix cache key with user ID: `todays-decision-cache-${user.id}` |
| **Cache versioning** | Add `version: 1` field to cached payload; validate on read |
| **Vary presentation only** | Rotation applied ONLY to exercises/text; risk driver selection remains deterministic |

---

## File Changes Overview

### File 1: `src/lib/riskDrivers.ts`

**Add date-based variation system (presentation only):**

```text
1. Add helper function: getLocalDateKey()
   - Returns: new Date().toLocaleDateString('en-CA') → "2026-01-27" (local time)

2. Add helper function: getDateRotationIndex(variationCount: number)
   - Uses local date as seed for deterministic daily index
   - Returns: number between 0 and variationCount-1

3. Add EXERCISE_SET_VARIATIONS constant:
   - Multiple exercise combinations per session type
   - Example: REST_DAY has 3 variants (breathing-focused, mobility-focused, movement-focused)

4. Add WHY_TEXT_VARIATIONS constant:
   - 2-3 text variations per risk driver type
   - Rotates "injuryRiskReduction" and "todayBenefit" text only
   - triggerMetric stays data-driven (no variation)

5. Modify generateWhyThisMatters():
   - Accept optional rotationIndex parameter
   - Select text variation using rotationIndex % variationCount

6. Modify generateStructuredSession():
   - Accept optional rotationIndex parameter  
   - Select exercise set using rotationIndex % exerciseVariantCount
   - Pass rotationIndex to generateWhyThisMatters()

7. Modify generateCorrectiveAction():
   - Calculate rotationIndex at the start
   - Pass rotationIndex to generateStructuredSession()
```

### File 2: `src/hooks/useTodaysDecision.ts`

**Update caching with user-scoping and versioning:**

```text
1. Add constant: CACHE_VERSION = 1

2. Modify CachedDecision interface:
   - Add: version: number

3. Modify getLocalDateKey():
   - Change: return new Date().toLocaleDateString('en-CA')
   - (Replaces UTC-based getTodayDateKey)

4. Modify getCacheKey(userId: string):
   - Returns: `todays-decision-cache-${userId}`

5. Modify getCachedDecision(userId: string):
   - Use user-scoped cache key
   - Validate version matches CACHE_VERSION
   - Invalidate if version mismatch

6. Modify setCachedDecision(decision, userId):
   - Use user-scoped cache key
   - Include version: CACHE_VERSION

7. Update fetchDecisionContext():
   - Get user.id early
   - Pass user.id to getCachedDecision and setCachedDecision
```

---

## Exercise Variation Sets (Example)

**Rest/Recovery Sessions:**

| Rotation | Main Exercises |
|----------|----------------|
| **Day 0** | Box breathing (4-4-4-4), Gentle walking (10-15 min), Light stretching |
| **Day 1** | Joint circles (all major joints), Cat-cow stretches (10 reps), Foam rolling (5-8 min) |
| **Day 2** | Easy walk or easy swim (15-20 min), Hip mobility (5 min each side), Deep breathing (5 min) |

**Light Cardio Sessions:**

| Rotation | Main Exercises |
|----------|----------------|
| **Day 0** | Easy cycling + Hip circles + Arm circles |
| **Day 1** | Incline walking + Thoracic rotations + Ankle mobility |
| **Day 2** | Swimming (easy laps) + World's greatest stretch + Deep squat hold |

---

## Why-This-Matters Text Variations (Example)

**For "strain" driver:**

| Rotation | injuryRiskReduction Text |
|----------|-------------------------|
| **Variant 0** | "High strain accumulates micro-damage. Reducing load allows repair and prevents it becoming macro-damage (injury)." |
| **Variant 1** | "Accumulated training stress requires extra recovery time. Backing off now protects your tendons and joints." |
| **Variant 2** | "Your weekly load has exceeded safe recovery capacity. Today's lighter session prevents long-term setback." |

---

## What Stays Exactly The Same

- Risk driver detection logic (based purely on metrics)
- Which driver is identified as primary/secondary
- Risk level calculation (low/moderate/high)
- Session type selection (rest/light/moderate/crossTrain)
- Intensity, HR zone, and RPE values
- User profile matching logic (injuries, equipment, preferences)
- Safety notes generation

---

## Expected User Experience

| Day | Risk Driver | Session Title | Exercises Shown |
|-----|-------------|---------------|-----------------|
| Monday | High Strain | Rest Day Session | Breathing, walking, stretching |
| Tuesday | High Strain | Rest Day Session | Joint circles, cat-cow, foam rolling |
| Wednesday | High Strain | Rest Day Session | Easy movement, hip mobility, deep breathing |

The underlying recommendation (Rest Day due to High Strain) remains constant because your metrics haven't changed. But the specific exercises and explanatory text rotate daily, providing variety.

---

## Technical Implementation Details

### Local Date Helper (fixes timezone issue)
```typescript
function getLocalDateKey(): string {
  return new Date().toLocaleDateString('en-CA'); // Returns YYYY-MM-DD in user's timezone
}
```

### Rotation Index Calculator
```typescript
function getDateRotationIndex(variationCount: number): number {
  const dateStr = getLocalDateKey();
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash) % variationCount;
}
```

### User-Scoped Cache Key
```typescript
const CACHE_VERSION = 1;

function getCacheKey(userId: string): string {
  return `todays-decision-cache-${userId}`;
}

function getCachedDecision(userId: string): CachedDecision | null {
  const cached = localStorage.getItem(getCacheKey(userId));
  if (!cached) return null;
  
  const parsed = JSON.parse(cached);
  
  // Validate version
  if (parsed.version !== CACHE_VERSION) {
    localStorage.removeItem(getCacheKey(userId));
    return null;
  }
  
  // Validate date (using local time)
  if (parsed.date !== getLocalDateKey()) {
    localStorage.removeItem(getCacheKey(userId));
    return null;
  }
  
  return parsed;
}
```

---

## Summary

This revised implementation:

1. Uses **local timezone** for date rotation (not UTC)
2. Scopes cache to **specific user** to prevent cross-user leakage
3. Adds **version field** for clean cache invalidation on future updates
4. Varies **only presentation** (exercises + explanatory text), never risk detection logic

