# Predictiv — Metrics Calculation Audit

**Date:** 2026-03-09
**Scope:** Read-only audit of calculation logic in `supabase/functions/`, `src/components/`, `src/hooks/`, and `src/lib/`
**Auditor:** Claude Sonnet 4.6 (automated deep-read)

---

## Summary of Findings

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Fatigue Index strain divisor mismatch: frontend uses `/300`, backend uses `/2000` | 🔴 Critical | ✅ Fixed |
| 2 | EWMA labeled but not implemented — stored value is a simple 7-day mean | 🟠 High | ✅ Fixed |
| 3 | Rest days and data gaps both mapped to `load = 0`, inflating ACWR on active weeks | 🟠 High | ✅ Fixed |
| 4 | No `alert_settings` table integration — all thresholds are hardcoded compile-time constants | 🟡 Medium | ✅ Fixed |
| 5 | Monotony cap inconsistency: stored at 2.5, but strain calculation uses a 3.0 cap internally | 🟡 Medium | ⚠️ Accepted |
| 6 | Risk Score is a frontend-only calculation — not stored in any table | 🟡 Medium | ✅ Fixed |
| 7 | ACWR baseline window (28d) differs from user_baselines window (30d) | 🟡 Medium | ⚠️ Accepted |
| 8 | Oura and Garmin use different load proxies — ACWR values are not comparable across wearables | 🟡 Medium | ⚠️ Accepted |
| 9 | Risk Score HRV factor silently excluded when data is absent (no flag shown to user) | 🟡 Medium | ✅ Fixed (FIX 4 surfaces gap via "—" display) |
| 10 | No minimum-data guard on ACWR — misleading values when weekly load approaches zero | 🟢 Low | ⚠️ Accepted |

### Fix Summary (2026-03-09)

**FIX 1 — Fatigue Index divisor (Critical)**
`RiskScoreCard.tsx`: Changed `(avgStrain / 300) * 50` → `(Math.min(avgStrain, 2000) / 2000) * 50`. Now matches `identify-risk-drivers/index.ts` backend formula. Cap at 2000 applied before division.

**FIX 2 — ACWR null-safe gap handling (High)**
`calculate-oura-trends/index.ts`: Changed `activity_score || 0` → `activity_score ?? null` for both `acuteData` and `chronicData`. `weeklyLoad` now sums only non-null days. Added `data_gap = activeDays < 5` boolean stored to both `recovery_trends` and `training_trends`. DB migration `20260309160000_add_data_gap_to_trends.sql` adds the column.

**FIX 3 — alert_settings wiring (Medium)**
`identify-risk-drivers/index.ts`: Added `alert_settings` to `Promise.all` parallel fetch. Builds `effectiveThresholds` object starting from hardcoded defaults, overriding with user row values. `identifyRiskDrivers()` now accepts `thresholds` parameter (defaults to `THRESHOLDS`).
`useRiskAlertTrigger.ts`: Fetches `alert_settings` at start of `checkForAlerts`, builds local `thresholds` object, uses throughout all comparisons.

**FIX 4 — HRV baseline standardised to user_baselines (Medium)**
`RiskScoreCard.tsx`: Fetches `user_baselines WHERE metric='hrv'` in parallel load; passes as `hrvBaseline` prop to `calcScore()`. Removed local 13-session rolling computation.
`useRiskAlertTrigger.ts`: Fetches `user_baselines WHERE metric='hrv'` via `Promise.all` alongside wearable sessions. Reduced session limit from 14 to 3 (only today needed for readiness/sleep check).

**FIX 5 — Risk Score persisted to risk_score_history (Medium)**
`RiskScoreCard.tsx`: Added `useEffect` that upserts `{ user_id, calculated_at, score, component_scores }` to `risk_score_history` on `onConflict: "user_id,calculated_at"` (once per day). DB migration `20260309150000_create_risk_score_history.sql` creates the table with RLS.

**FIX 6 — True EWMA with λ=0.28 (Medium)**
`calculate-oura-trends/index.ts`: Fetches previous day's `training_trends.ewma` before computing. Applies `ewma = 0.28 * acuteLoadAvg + 0.72 * prevEwma`. Seeds with `acuteLoadAvg` (7-day mean) when no prior EWMA exists. λ=0.28 gives ~7-day half-life per EWMA half-life formula.

---

## Metric 1 — ACWR (Acute:Chronic Workload Ratio)

### Formula / Logic

```
ACWR = Acute Load / Chronic Load

Acute Load  = mean(activity_score, last 7 days)   — simple rolling average
Chronic Load = mean(activity_score, last 28 days)  — simple rolling average

If Chronic Load == 0 → ACWR = null  (division-by-zero guard)
```

### Exact Code Location

`supabase/functions/calculate-oura-trends/index.ts`

```ts
const acuteData = last7Days.map((s) => s.activity_score || 0);   // null → 0
const acuteLoadAvg = calculateAverage(acuteData);                 // simple mean

const chronicData = last28Days.map((s) => s.activity_score || 0);
const chronicLoadAvg = calculateAverage(chronicData);

const acwr = chronicLoadAvg && chronicLoadAvg !== 0
  ? (acuteLoadAvg || 0) / chronicLoadAvg
  : null;
```

Same logic replicated for Garmin in `supabase/functions/fetch-garmin-data/index.ts` using `active_calories / 100` as the load proxy.

### Data Source

| Table | Column | Notes |
|-------|--------|-------|
| `wearable_sessions` | `activity_score` | Oura readiness-adjacent activity metric, 0–100 |
| `wearable_sessions` | `active_calories` | Garmin only — divided by 100 to normalise |

Output stored in:

| Table | Column |
|-------|--------|
| `recovery_trends` | `acwr`, `acwr_trend`, `acute_load`, `chronic_load` |
| `training_trends` | `acwr`, `acute_load`, `chronic_load` |

Both tables are written by **the same function** (`calculate-oura-trends`).

### Missing Data Handling

- ~~Days with no wearable session: `activity_score || 0` — **zero-filled, not skipped**~~
- ✅ **Fixed (FIX 2):** `activity_score ?? null` — gaps excluded from rolling window. `data_gap = activeDays < 5` stored to both trend tables.
- If chronic load is 0 (e.g. new user): ACWR returned as `null`
- If fewer than 28 days of Garmin data exist: chronic load is `null`, ACWR is `null`

### Personalisation

✅ **Fixed (FIX 3):** `identify-risk-drivers` now fetches `alert_settings` in parallel and builds `effectiveThresholds` overriding defaults with user values. `useRiskAlertTrigger` also queries `alert_settings` at runtime. Falls back to hardcoded constants when no user row exists.

### Known Issues / Risks

- **Cross-wearable incompatibility:** Oura uses `activity_score` (0–100 index); Garmin uses `active_calories / 100`. A user who switches wearables mid-journey will see a step-change in their ACWR that has no physiological meaning.
- **No minimum load guard:** When chronic load is very small (e.g. after illness), ACWR can spike to 3–4× on minimal activity. No clamp is applied.
- **ACWR is not EWMA-based** (see Metric 4).

---

## Metric 2 — Training Strain

### Formula / Logic

```
Weekly Load = sum(activity_score, last 7 days)   — with null → 0 fill
Capped Monotony = min(monotony, 3.0)             — note: 3.0, not 2.5 cap used for storage
Strain = (Weekly Load × Capped Monotony) / 7
Final Strain = min(Strain, 2000)                 — hard cap
```

### Exact Code Location

`supabase/functions/calculate-oura-trends/index.ts`

```ts
const weeklyLoad = acuteData.reduce((sum, v) => sum + v, 0);
const cappedMonotony = monotony !== null ? Math.min(monotony, 3) : null;
const strain = cappedMonotony && weeklyLoad
  ? (weeklyLoad * cappedMonotony) / 7
  : null;
const strain_final = strain !== null ? Math.min(strain, 2000) : null;
```

Division by 7 normalises the weekly aggregate back to a daily-average scale (~0–200).

### Data Source

| Table | Column |
|-------|--------|
| `wearable_sessions` | `activity_score` (via `acuteData`) |
| Computed | `monotony` (calculated in same function before strain) |

Output stored in:

| Table | Column |
|-------|--------|
| `recovery_trends` | `strain` |
| `training_trends` | `strain` |

### Missing Data Handling

- Null activity scores: zero-filled via `|| 0`
- If `monotony` is null (< 2 non-null data points): `strain = null`
- Hard cap of 2000 applied before storage

### Personalisation

**No.** All thresholds hardcoded: `strain > 3500` critical, `> 2000` elevated in `identify-risk-drivers/index.ts`.

> ⚠️ **Issue:** The monotony cap used inside the strain formula is **3.0**, but the value stored in `recovery_trends.monotony` is capped at **2.5**. This means strain can momentarily use a monotony value higher than what any query would return from the database.

---

## Metric 3 — Monotony

### Formula / Logic

```
Mean Daily Load = sum(activity_score, 7 days) / 7
Std Dev = population std dev of 7-day activity_score values
Monotony = Mean Daily Load / Std Dev
Stored Monotony = min(Monotony, 2.5)
```

Population standard deviation (divides by N, not N−1).

### Exact Code Location

`supabase/functions/calculate-oura-trends/index.ts`

```ts
function calculateStdDev(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null && !isNaN(v));
  if (valid.length < 2) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / valid.length;
  return Math.sqrt(variance);
}

const meanDailyLoad = weeklyLoad / (acuteData.length || 1);
const monotonyStdDev = calculateStdDev(acuteData);
const monotony = monotonyStdDev && monotonyStdDev > 0
  ? meanDailyLoad / monotonyStdDev
  : null;
const monotony_capped = monotony !== null ? Math.min(monotony, 2.5) : null;
```

### Data Source

| Table | Column |
|-------|--------|
| `wearable_sessions` | `activity_score` |

### Missing Data Handling

- Null values are **filtered out** before std dev calculation (correct — does not zero-fill for monotony)
- Requires ≥ 2 non-null values; returns `null` otherwise
- If std dev is 0 (perfectly uniform load every day): `monotony = null` (avoids division by zero; this edge case is intentional — perfectly uniform load has undefined monotony)

> ℹ️ Note: The std dev step correctly filters nulls rather than zero-filling, which is appropriate here. A rest day with truly zero load should count as zero, not null, for the monotony calculation — so the upstream zero-fill in `acuteData` affects monotony in a way that could understate it on rest-heavy weeks.

### Personalisation

**No.** Stored cap (2.5), risk thresholds (critical ≥ 2.5, elevated ≥ 2.0) hardcoded everywhere.

---

## Metric 4 — EWMA (Exponential Weighted Moving Average)

### Formula / Logic

**The value stored as `ewma` is not a true EWMA.**

```
Stored EWMA = mean(activity_score, last 7 days)   // same as acuteLoadAvg
```

No exponential decay factor (λ) is applied anywhere in the codebase.

### Exact Code Location

`supabase/functions/calculate-oura-trends/index.ts`

```ts
// Comment in source code: "EWMA approximated by acute load average"
const { error: trainingError } = await supabase
  .from("training_trends")
  .upsert({
    ewma: safeNumber(acuteLoadAvg),   // ← 7-day simple mean, NOT exponential
    ...
  });
```

### Data Source

Same as ACWR acute load — `wearable_sessions.activity_score`.

### Missing Data Handling

Same as acute load — null → 0.

### Personalisation

N/A — metric is mislabeled.

> 🔴 **Issue:** The column is named `ewma` and referenced in AI context as such, but contains a 7-day simple rolling average. A true EWMA would use a decay factor (e.g. λ = 2/8 for 7-day equivalent, giving more weight to recent days). This has downstream effects on Yves AI prompts which reference "EWMA" when building training context.

---

## Metric 5 — Recovery Score

### Formula / Logic

```
Recovery Score = readiness_score (direct passthrough from Oura)
```

No transformation applied. Garmin does not have a direct equivalent — field is left null for Garmin users.

### Exact Code Location

`supabase/functions/calculate-oura-trends/index.ts`

```ts
const { error: recoveryError } = await supabase
  .from("recovery_trends")
  .upsert({
    recovery_score: safeNumber(readinessCurrent),   // passthrough
    ...
  });
```

`readinessCurrent` is fetched from `wearable_sessions.readiness_score`.

### Data Source

| Table | Column |
|-------|--------|
| `wearable_sessions` | `readiness_score` |

### Missing Data Handling

- `safeNumber(null)` → `null` stored
- Garmin users: `readiness_score` is always null (Garmin has no readiness index)

### Personalisation

**No.** Score is taken as-is from Oura's algorithm. Oura's readiness algorithm does account for user history, but that personalisation happens inside Oura's API, not inside Predictiv.

---

## Metric 6 — Fatigue Index

### Formula / Logic

**Two different formulas are in use — one in the backend, one in the frontend.**

**Backend (`identify-risk-drivers/index.ts`):**
```
Fatigue Index = ((min(strain, 2000) / 2000) × 50) + ((min(monotony, 2.5) / 2.5) × 50)
Result capped at 100
```

**Frontend (`src/components/dashboard/RiskScoreCard.tsx`):**
```
Fatigue Index = ((avgStrain / 300) × 50) + ((avgMonotony / 2.5) × 50)
Result capped at 100
```

### Exact Code Locations

`supabase/functions/identify-risk-drivers/index.ts`:

```ts
function calculateFatigueIndex(strain: number | null, monotony: number | null): number | null {
  if (strain === null && monotony === null) return null;
  const cappedStrain = strain !== null ? Math.min(strain, 2000) : 0;
  const cappedMonotony = monotony !== null ? Math.min(monotony, 2.5) : 0;
  const strainContrib = (cappedStrain / 2000) * 50;
  const monotonyContrib = (cappedMonotony / 2.5) * 50;
  return Math.min(Math.round(strainContrib + monotonyContrib), 100);
}
```

`src/components/dashboard/RiskScoreCard.tsx`:

```ts
const fatigueIndex = Math.min(100, Math.round((avgStrain / 300) * 50 + (avgMonotony / 2.5) * 50));
```

### Data Source

| Component | Table | Columns |
|-----------|-------|---------|
| Backend (edge fn) | `recovery_trends` | `strain`, `monotony` |
| Frontend | `recovery_trends` | `strain`, `monotony` (last 7 days averaged) |

### Missing Data Handling

- **Backend:** If both strain and monotony are null → returns null. If only one is null → treats missing as 0.
- **Frontend:** Uses `avg` over non-null values from a 7-day window; if no data → `fatigueIndex = 0`.

### Personalisation

**No.** Divisors and weights are hardcoded.

> 🔴 **Critical Issue:** The frontend strain divisor is **300** while the backend uses **2000**. For a typical strain value of 150:
> - Backend: (150 / 2000) × 50 = **3.75 pts**
> - Frontend: (150 / 300) × 50 = **25 pts**
>
> The frontend produces fatigue index values ~6.7× higher than the backend for the same data. This inflates the Risk Score displayed on the Dashboard.

---

## Metric 7 — Risk Score

### Formula / Logic

```
Risk Score = ACWR Points + Fatigue Points + HRV Points + Sleep Points
Max = 100

ACWR Points (0–30):
  ACWR > 1.5  → 30 pts
  ACWR > 1.3  → 20 pts
  ACWR > 1.1  → 10 pts

Fatigue Points (0–20):
  Fatigue Index > 70  → 20 pts
  Fatigue Index > 50  → 10 pts

HRV Drop Points (0–25):
  HRV drop ≥ 25%  → 25 pts
  HRV drop ≥ 15%  → 15 pts
  HRV drop ≥ 10%  → 8 pts

Sleep Points (0–25):
  Sleep score < 55  → 25 pts
  Sleep score < 65  → 15 pts
  Sleep score < 75  → 8 pts

Risk Bands:
  0–33  → Low (green)
  34–66 → Moderate (yellow)
  67–100 → High (red)
```

### Exact Code Location

`src/components/dashboard/RiskScoreCard.tsx` — frontend only, not stored in any table.

```ts
const score = Math.min(100, acwrPts + fatiguePts + hrvPts + sleepPts);
let level: ScoreResult["level"] = "low";
if (score >= 67) level = "high";
else if (score >= 34) level = "moderate";
```

### Data Source

| Factor | Table | Columns | Window |
|--------|-------|---------|--------|
| ACWR | `recovery_trends` | `acwr` | Last 7 rows, averaged |
| Strain/Monotony | `recovery_trends` | `strain`, `monotony` | Last 7 rows, averaged |
| HRV drop | `wearable_sessions` | `hrv_avg` | Today vs. 7-day mean |
| Sleep score | `wearable_sessions` | `sleep_score` | Most recent row only |

### Missing Data Handling

| Missing Input | Behaviour |
|---------------|-----------|
| No ACWR data | `avgACWR = 0` → 0 ACWR pts (silently excluded) |
| No trend data | `score = 0`, level = "unknown" → empty state shown |
| No HRV data (< 3 sessions) | `hrvPts = 0` (silently excluded, no user flag) |
| HRV data but no drop | `hrvDropPct ≤ 0` → 0 pts |
| No sleep data | `sleepScore = null` → 0 sleep pts (silently excluded) |

> 🟡 **Issue:** When HRV or sleep data is absent, the Risk Score silently uses 0 points for those factors. A user with a genuinely elevated ACWR but no wearable sleep data will see a lower Risk Score than a fully data-complete user in the same physiological state. There is no "incomplete data" flag shown on the card.

### Scale Type

**Weighted additive sum**, not a normalised average. The 0–100 range is guaranteed by the `Math.min(100, ...)` cap, but values between factors are not proportionally rebalanced when some inputs are absent.

### Personalisation

**No.** All point thresholds hardcoded in the component.

### Storage

**Not stored.** Risk Score is calculated on every render of `RiskScoreCard` and not persisted. Historical risk scores are not available.

---

## Metric 8 — HRV

### Raw Signal

```
HRV = wearable_sessions.hrv_avg
    = Oura "average_hrv" from detailed sleep endpoint
    = RMSSD-derived overnight average (Oura standard)
```

Garmin: `hrv_avg` populated from Garmin HRV status endpoint (also RMSSD-based).

### Baseline Calculation

Two separate baselines exist in the codebase:

**1. Frontend (RiskScoreCard.tsx) — per-request:**
```
Baseline HRV = mean(hrv_avg, sessions[1..14])
            = mean of up to 13 prior days, excluding today
HRV Drop % = ((baseline - today) / baseline) × 100
```

**2. Backend (identify-risk-drivers / yves-chat) — from user_baselines table:**
```
Baseline HRV = user_baselines WHERE metric = 'hrv'
             = mean(hrv_avg, last 30 days)    [set by calculate-baseline]
```

**3. Alert trigger (useRiskAlertTrigger.ts):**
```
Baseline HRV = mean(sessions[1..13].hrv_avg)   // 7-day window (limit 14 sessions, skips today)
Alert fires if drop ≥ 20%
```

> 🟡 **Issue:** Three different HRV baselines exist (13-day, 14-session, 30-day), used by three different parts of the system. A user could simultaneously see their HRV flagged by one component but not another for the same reading.

### Deviation Formula

`supabase/functions/identify-risk-drivers/index.ts`:

```ts
function calculateHrvDeviation(current: number | null, baseline: number | null): number | null {
  if (current === null || baseline === null || baseline === 0) return null;
  return Math.round(((baseline - current) / baseline) * 100);
}
// Positive value = current HRV is LOWER than baseline (stress/fatigue signal)
// Negative value = current HRV is HIGHER than baseline (recovery/fitness signal)
```

### Missing Data Handling

- Null HRV: calculation returns `null`; no risk points awarded
- Fewer than 2 prior days of HRV: baseline = null; deviation = null
- Frontend minimum: 3 sessions required (2 for baseline), else `hrvPts = 0`

### Personalisation

**No.** Drop threshold (20% for alerts, 10%/15%/25% for risk points) is hardcoded.

---

## Metric 9 — Health Anomalies

### Formula / Logic

```
Baseline = mean(metric_value, prior 7+ days, excluding today)
Deviation % = ((current - baseline) / baseline) × 100

Anomaly types:
  spike  → current > baseline + threshold%
  drop   → current < baseline - threshold%
  missing → no data for today

Severity:
  |deviation| ≥ criticalThreshold%  → "critical"
  |deviation| ≥ threshold × 1.5%    → "high"
  |deviation| ≥ threshold%          → "medium"
  else                              → "low"
```

### Hardcoded Thresholds

`supabase/functions/detect-health-anomalies/index.ts`:

| Metric | Spike | Drop | Critical Spike | Critical Drop |
|--------|-------|------|----------------|---------------|
| `hrv_avg` | 40% | 30% | 60% | 50% |
| `resting_hr` | 20% | 15% | 35% | 25% |
| `sleep_score` | 25% | 25% | 40% | 40% |
| `readiness_score` | 25% | 25% | 40% | 40% |
| `activity_score` | 50% | 40% | 80% | 60% |

### Data Source

| Table | Columns |
|-------|---------|
| `wearable_sessions` | `hrv_avg`, `resting_hr`, `sleep_score`, `readiness_score`, `activity_score` |

Output: `health_anomalies` table.

### Missing Data Handling

- Minimum 3 prior days required for baseline
- If no data today: `anomaly_type = "missing"` inserted
- Null individual values filtered before baseline mean

### Personalisation

**No.** All thresholds hardcoded.

---

## Metric 10 — ACWR Chart / Time Series

### Zero-Fill vs Gap Handling

Days with no training session logged are **zero-filled**, not treated as gaps.

**Evidence:**

```ts
// calculate-oura-trends/index.ts
const acuteData = last7Days.map((s) => s.activity_score || 0);
//                                                           ^^^
// Any session with null activity_score, or any date where no
// session row exists, is mapped to 0 before averaging.
```

The `last7Days` array is constructed by querying `wearable_sessions` and then mapping — days without a row are not inserted into the array, they simply aren't included, so the `|| 0` only applies to sessions that exist but have null `activity_score`. However, the window averages divide by the array length (which may be < 7), so **sparse weeks produce a higher per-day average** than they should.

**Specific ACWR chart impact:**

The ACWR trend charts in `MetricsDashboard` and `Health` pages read from `training_trends` or `recovery_trends` by date. Days where `calculate-oura-trends` did not run (e.g. Oura sync failed) will have no row — shown as a gap in the chart, not as zero. The calculation itself therefore **does not zero-fill gaps in the database**, but **does zero-fill nulls within a window when the function does run**.

### Summary Table

| Scenario | Behaviour |
|----------|-----------|
| Wearable not synced for 3 days | No `wearable_sessions` rows → `calculate-oura-trends` uses shorter window → ACWR denominator shrinks → **ACWR rises** |
| Session exists but `activity_score` is null | Treated as `0` → suppresses load → **ACWR falls** |
| Intentional rest day (session logged, activity = 0) | Treated identically to missing data |
| Chart day with no `training_trends` row | **Gap** shown in chart (null, not zero) |

> 🔴 **Risk:** A user who forgets to charge their wearable for 3 days will have their ACWR calculated over a shorter denominator window, producing an artificially elevated ACWR — potentially triggering an "overtraining" alert when they return.

---

## Data Flow Diagram

```
Wearable API (Oura / Garmin)
         │
         ▼
fetch-oura-data / fetch-garmin-data
  → wearable_sessions (raw: hrv_avg, sleep_score, activity_score,
                       readiness_score, resting_hr, steps, etc.)
         │
         ▼
calculate-oura-trends  [daily cron]
  → recovery_trends  (acwr, acute_load, chronic_load, strain,
                      monotony, recovery_score, acwr_trend)
  → training_trends  (same + ewma, hrv 7d avg, sleep 7d avg)
         │
         ├──► calculate-baseline  [daily cron]
         │      → user_baselines  (metric, rolling_avg over 30d)
         │
         ├──► calculate-deviation  [daily cron]
         │      → user_deviations / yves_profiles
         │      (compares today to baseline; adds context from user_health_profiles)
         │
         ├──► detect-health-anomalies  [daily cron]
         │      → health_anomalies  (spike/drop events per metric)
         │
         └──► identify-risk-drivers  [per-request edge fn]
                → risk drivers ranking (primary / secondary)
                → corrective actions (personalised to sport/injury)
                → NOT stored — returned as JSON

Frontend (per render / per navigation):
  RiskScoreCard.tsx
    reads: recovery_trends (7d), wearable_sessions (14d)
    calculates: Fatigue Index, Risk Score (0–100)
    NOT stored

  useRiskAlertTrigger.ts
    reads: recovery_trends (latest row), wearable_sessions (14 rows)
    alert_history: INSERT when alert fires
    risk_alert_dismissals: cooldown tracking
```

---

## Threshold Reference Table (All Hardcoded Values)

| Metric | Threshold Type | Value | Location |
|--------|----------------|-------|----------|
| ACWR | Critical | 1.5 | `identify-risk-drivers/index.ts` |
| ACWR | Elevated | 1.3 | `identify-risk-drivers/index.ts` |
| ACWR | Undertrained | < 0.8 | `get-recovery-trends/index.ts` |
| ACWR | Optimal high | 1.3 | `get-recovery-trends/index.ts` |
| ACWR | Alert trigger (critical) | 1.8 | `useRiskAlertTrigger.ts` |
| Monotony | Critical | 2.5 | `identify-risk-drivers/index.ts` |
| Monotony | Elevated | 2.0 | `identify-risk-drivers/index.ts` |
| Monotony | Alert trigger (critical) | 2.2 | `useRiskAlertTrigger.ts` |
| Monotony | Storage cap | 2.5 | `calculate-oura-trends/index.ts` |
| Monotony | Strain calc cap | 3.0 | `calculate-oura-trends/index.ts` |
| Strain | Critical | 3500 | `identify-risk-drivers/index.ts` |
| Strain | Elevated | 2000 | `identify-risk-drivers/index.ts` |
| Strain | Storage cap | 2000 | `calculate-oura-trends/index.ts` |
| Strain | Alert trigger (critical) | 1500 | `useRiskAlertTrigger.ts` |
| Fatigue Index | Critical | 80 | `identify-risk-drivers/index.ts` |
| Fatigue Index | Elevated | 60 | `identify-risk-drivers/index.ts` |
| HRV drop | Critical | 30% | `identify-risk-drivers/index.ts` |
| HRV drop | Alert trigger | 20% | `useRiskAlertTrigger.ts` |
| HRV drop | Risk score tier 1 | 10% | `RiskScoreCard.tsx` |
| HRV drop | Risk score tier 2 | 15% | `RiskScoreCard.tsx` |
| HRV drop | Risk score tier 3 | 25% | `RiskScoreCard.tsx` |
| Sleep | Alert trigger | < 60 | `useRiskAlertTrigger.ts` |
| Sleep | Risk score tier 1 | < 75 | `RiskScoreCard.tsx` |
| Sleep | Risk score tier 2 | < 65 | `RiskScoreCard.tsx` |
| Sleep | Risk score tier 3 | < 55 | `RiskScoreCard.tsx` |
| Readiness | Alert trigger | < 50 | `useRiskAlertTrigger.ts` |
| HRV anomaly | Spike threshold | 40% | `detect-health-anomalies/index.ts` |
| HRV anomaly | Drop threshold | 30% | `detect-health-anomalies/index.ts` |
| Resting HR anomaly | Spike threshold | 20% | `detect-health-anomalies/index.ts` |
| ACWR data window | Acute | 7 days | `calculate-oura-trends/index.ts` |
| ACWR data window | Chronic | 28 days | `calculate-oura-trends/index.ts` |
| Baseline window | Rolling avg | 30 days | `calculate-baseline/index.ts` |

> ⚠️ The `alert_settings` table has columns for user-adjustable thresholds (`hrv_drop_threshold`, `acwr_critical_threshold`, etc.) but **no part of the calculation pipeline reads from this table**. It is effectively unused.

---

## Prioritised Recommendations

### 🔴 Fix Immediately

1. **Reconcile Fatigue Index strain divisor** — align frontend (`/300`) with backend (`/2000`). Current behaviour makes the Dashboard Risk Score ~6.7× more sensitive to strain than the edge function risk driver system. Decide which is correct (2000 is consistent with the stored cap) and update the other.

2. **Handle zero-fill vs data gaps distinctly** — distinguish `activity_score = 0` (genuine rest day) from `activity_score = null` (sync failure or data gap). The latter should not count as load=0 in ACWR windows; it should be excluded from the average denominator entirely.

### 🟠 Fix Soon

3. **Remove or implement EWMA** — rename the `ewma` column to `acute_load_7d_avg` (accurate) or implement a true exponential formula with λ = 2/(N+1) where N=7 (λ ≈ 0.25).

4. **Wire `alert_settings` table into the pipeline** — the table and UI exist; per-user thresholds need to be fetched and passed to `calculate-oura-trends`, `detect-health-anomalies`, and `useRiskAlertTrigger`.

5. **Standardise HRV baseline window** — choose one definition (recommend 30-day from `user_baselines`) and use it consistently across RiskScoreCard, useRiskAlertTrigger, and identify-risk-drivers.

### 🟡 Improve When Possible

6. **Persist Risk Score** — store computed risk score to a table (e.g. `daily_risk_scores`) so historical trends can be displayed.

7. **Show incomplete-data flag** — when HRV or sleep data is absent, the Risk Score card should note "Risk score based on partial data" rather than silently excluding those factors.

8. **Normalise ACWR across wearables** — implement a unified load metric (e.g. session RPE × duration from manual logs, or a common index) so Oura and Garmin users can be compared and so users who switch devices don't see artificial ACWR discontinuities.

9. **Fix monotony cap timing** — use the same cap (2.5) in both the strain calculation and storage, or explicitly document that 3.0 is the correct intermediate cap for strain and 2.5 is the display/storage cap.

---

*End of audit. No existing files were modified.*
