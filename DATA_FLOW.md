# Data Flow Documentation

> Detailed metric calculation journeys from raw data to AI-powered insights in the Predictiv platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Metric Calculation Journeys](#metric-calculation-journeys)
   - [ACWR (Acute:Chronic Workload Ratio)](#acwr-acutechronic-workload-ratio)
   - [Training Strain](#training-strain)
   - [Training Monotony](#training-monotony)
   - [HRV (Heart Rate Variability)](#hrv-heart-rate-variability)
   - [Readiness Score](#readiness-score)
   - [Sleep Score](#sleep-score)
3. [Data Transformation Pipeline](#data-transformation-pipeline)
4. [Risk Zone Calculation](#risk-zone-calculation)
5. [AI Context Integration](#ai-context-integration)

---

## Overview

This document traces the complete journey of health metrics from raw wearable data through calculation, baseline comparison, risk analysis, and AI intelligence integration.

**Key Principles:**
- **No Step Skipped:** Every transformation is documented
- **Source Attribution:** Each metric has a defined origin
- **Formula Transparency:** All calculations shown with examples
- **Destination Clarity:** Storage locations and access patterns documented

---

## Metric Calculation Journeys

### ACWR (Acute:Chronic Workload Ratio)

**Purpose:** Measure training load balance to prevent overtraining and injury

**Complete Journey:**

#### Step 1: Raw Data Collection
**Source:** Oura API v2 - `/daily_activity` endpoint

```json
{
  "day": "2025-11-02",
  "score": 85,
  "steps": 12500,
  "active_calories": 450
}
```

#### Step 2: Training Load Calculation
**Location:** `fetch-oura-auto` Edge Function (lines 263-266)

```typescript
const activityScore = dayData.activity?.score || 0;
const steps = dayData.activity?.steps || 0;
const trainingLoad = activityScore * (steps / 10000);
```

**Example:**
```
Training Load = 85 × (12500 / 10000)
Training Load = 85 × 1.25
Training Load = 106.25
```

**Rationale:** Combines intensity (activity_score) with volume (steps normalized to 10k base)

#### Step 3: Storage in wearable_sessions
**Table:** `wearable_sessions`
**Columns:** user_id, date, source, activity_score, total_steps

```sql
INSERT INTO wearable_sessions (user_id, date, source, activity_score, total_steps)
VALUES ('user-uuid', '2025-11-02', 'oura', 85, 12500)
ON CONFLICT (user_id, source, date) DO UPDATE SET ...;
```

#### Step 4: Historical Data Retrieval
**Location:** `fetch-oura-auto` Edge Function (lines 252-258)

```typescript
const { data: historicalSessions } = await supabase
  .from("wearable_sessions")
  .select("*")
  .eq("user_id", userId)
  .eq("source", "oura")
  .gte("date", last35DaysDate)
  .order("date", { ascending: true });
```

**Result:** 35 days of data for ACWR calculation

#### Step 5: Acute Load Calculation (7-Day Average)
**Location:** `fetch-oura-auto` Edge Function (lines 288-297)

```typescript
const last7Days = historicalSessions
  .filter(s => s.date <= currentDate)
  .slice(-7);

const acuteLoad = last7Days.reduce((sum, s) => {
  const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
  return sum + load;
}, 0) / 7;
```

**Example:**
```
Day 1: 100, Day 2: 110, Day 3: 105, Day 4: 95, Day 5: 106, Day 6: 108, Day 7: 102
Acute Load = (100+110+105+95+106+108+102) / 7 = 103.71
```

#### Step 6: Chronic Load Calculation (28-Day Average)
**Location:** `fetch-oura-auto` Edge Function (lines 288-302)

```typescript
const last28Days = historicalSessions
  .filter(s => s.date <= currentDate)
  .slice(-28);

const chronicLoad = last28Days.reduce((sum, s) => {
  const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
  return sum + load;
}, 0) / 28;
```

**Example:**
```
Sum of 28 days = 2800
Chronic Load = 2800 / 28 = 100
```

#### Step 7: ACWR Calculation
**Formula:** `ACWR = Acute Load / Chronic Load`

```typescript
const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;
```

**Example:**
```
ACWR = 103.71 / 100 = 1.037
```

**Interpretation:**
- **< 0.8:** Undertraining (detraining risk)
- **0.8 - 1.3:** Optimal training zone
- **1.3 - 1.5:** Elevated risk
- **> 1.5:** High injury risk

#### Step 8: Storage in wearable_summary
**Table:** `wearable_summary`
**Columns:** user_id, date, source, acwr

```sql
INSERT INTO wearable_summary (user_id, date, source, acwr)
VALUES ('user-uuid', '2025-11-02', 'oura', 1.04)
ON CONFLICT (user_id, source, date) DO UPDATE SET acwr = 1.04;
```

#### Step 9: Baseline Calculation
**Function:** `calculate-baseline`
**Frequency:** Hourly

```typescript
// Fetch last 30 days of ACWR values
const { data: fitbitData } = await supabase
  .from('fitbit_trends')
  .select('acwr')
  .gte('date', thirtyDaysAgo)
  .eq('user_id', userId);

// Calculate rolling average
const baseline = acwrValues.reduce((a, b) => a + b, 0) / acwrValues.length;
```

**Example:**
```
30-day ACWR values: [1.05, 1.02, 1.08, ..., 1.04]
Baseline = 1.06 (average)
```

**Storage:** `user_baselines` table
```sql
INSERT INTO user_baselines (user_id, metric, rolling_avg, data_window)
VALUES ('user-uuid', 'acwr', 1.06, 30);
```

#### Step 10: Deviation Detection
**Function:** `calculate-deviation`
**Frequency:** Hourly

```typescript
const baseline = 1.06;  // From user_baselines
const currentValue = 1.37;  // Latest from wearable_summary
const deviation = ((currentValue - baseline) / baseline) * 100;
// deviation = ((1.37 - 1.06) / 1.06) * 100 = 29.2%
```

#### Step 11: Risk Zone Assignment
**Logic:** See `calculate-deviation` lines 93-95

```typescript
let riskStatus = Math.abs(deviation) < 10 ? 'low' :
                 Math.abs(deviation) < 25 ? 'moderate' :
                 'high';
// 29.2% > 25% → riskStatus = 'high'
```

**Storage:** `adaptive_recommendations` table
```sql
INSERT INTO adaptive_recommendations (
  user_id, metric, deviation_pct, risk_status, risk_level
) VALUES (
  'user-uuid', 'acwr', 29.2, 'high', 'red'
);
```

#### Step 12: AI Context Integration
**Function:** `yves-chat`

```typescript
const { data: recommendations } = await supabase
  .from('adaptive_recommendations')
  .select('*')
  .eq('user_id', userId)
  .eq('metric', 'acwr');

const prompt = `
BASELINE & RISK ANALYSIS:
ACWR: Current 1.37 vs Baseline 1.06 (+29.2% deviation) – Risk Zone: RED
[AI prioritizes this in coaching response]
`;
```

#### Step 13: User Display
**UI Components:**
- **Dashboard:** Displays current ACWR with color-coded indicator
- **Health Page:** Shows 30-day ACWR trend chart
- **Yves Chat:** Provides contextual advice on reducing acute load

---

### Training Strain

**Purpose:** Measure cumulative training stress over 7 days

**Complete Journey:**

#### Step 1-3: Same as ACWR (Raw Data → Training Load → Storage)

#### Step 4: 7-Day Strain Calculation
**Location:** `fetch-oura-auto` Edge Function (lines 269-277)

```typescript
const last7Days = historicalSessions
  .filter(s => s.date <= currentDate)
  .slice(-7);

const strain = last7Days.reduce((sum, s) => {
  const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
  return sum + load;
}, 0);
```

**Example:**
```
Day 1: 100, Day 2: 110, Day 3: 105, Day 4: 95, Day 5: 106, Day 6: 108, Day 7: 102
Strain = 100 + 110 + 105 + 95 + 106 + 108 + 102 = 726
```

**Interpretation:**
- **< 500:** Light training week
- **500-800:** Moderate training week
- **800-1200:** Heavy training week
- **> 1200:** Very heavy training week

#### Step 5: Storage & Baseline Calculation
**Storage:** `wearable_summary.strain`
**Baseline:** 30-day rolling average in `user_baselines`
**Deviation:** Compared in `calculate-deviation`

**Risk Thresholds:**
- **< 10% deviation:** Green zone
- **10-25% deviation:** Yellow zone (monitor closely)
- **> 25% deviation:** Red zone (high risk of overtraining)

---

### Training Monotony

**Purpose:** Measure training variety (high monotony = injury risk)

**Complete Journey:**

#### Step 1-3: Same as ACWR (Raw Data → Training Load → Storage)

#### Step 4: Monotony Calculation
**Location:** `fetch-oura-auto` Edge Function (lines 280-285)
**Formula:** `Monotony = Mean / Standard Deviation`

```typescript
const loads = last7Days.map(s =>
  (s.activity_score || 0) * ((s.total_steps || 0) / 10000)
);

const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
const variance = loads.reduce((sum, load) =>
  sum + Math.pow(load - mean, 2), 0
) / loads.length;
const std = Math.sqrt(variance);
const monotony = std > 0 ? mean / std : 0;
```

**Example:**
```
Loads: [100, 110, 105, 95, 106, 108, 102]
Mean = 103.71
Variance = 21.06
Std = 4.59
Monotony = 103.71 / 4.59 = 22.6
```

**Interpretation:**
- **< 15:** Good training variety
- **15-25:** Moderate variety
- **> 25:** High monotony (injury risk)

#### Step 5: Storage & Risk Assessment
**Storage:** `wearable_summary.monotony`
**Baseline:** 30-day average (ideal: 15-20)
**Risk Logic:** High monotony + high strain = red flag

**AI Context:**
```typescript
if (monotony > 25 && strain > 800) {
  recommendation = "Vary your training: add easy days, cross-training, or rest";
}
```

---

### HRV (Heart Rate Variability)

**Purpose:** Primary recovery indicator (autonomic nervous system health)

**Complete Journey:**

#### Step 1: Raw Data Collection
**Source:** Oura API v2 - `/daily_sleep` endpoint

```json
{
  "day": "2025-11-02",
  "average_hrv": 52,
  "lowest_heart_rate": 48
}
```

#### Step 2: Storage in wearable_sessions
**Location:** `fetch-oura-auto` Edge Function (lines 223-235)

```typescript
const sessionData = {
  user_id: userId,
  date,
  source: "oura",
  hrv_avg: dayData.sleep?.average_hrv || null,
  resting_hr: dayData.sleep?.lowest_heart_rate || null
};
```

**Table:** `wearable_sessions.hrv_avg`

#### Step 3: Baseline Calculation
**Function:** `calculate-baseline`
**Window:** 30 days

```typescript
const hrvValues = last30Days.map(s => s.hrv_avg).filter(v => v !== null);
const hrvBaseline = hrvValues.reduce((a, b) => a + b, 0) / hrvValues.length;
```

**Example:**
```
30-day HRV values: [50, 52, 48, 51, ..., 53]
Baseline = 51.2 ms
```

#### Step 4: Deviation & Risk Assessment
**Current:** 45 ms
**Baseline:** 51.2 ms
**Deviation:** ((45 - 51.2) / 51.2) × 100 = -12.1%

**Risk Logic:**
```typescript
// HRV decrease = recovery deficit
if (deviation < -10%) {
  riskStatus = 'moderate';
  reasoning = 'HRV drop suggests incomplete recovery. Consider rest or easy training.';
}
if (deviation < -20%) {
  riskStatus = 'high';
  reasoning = 'Significant HRV drop. High overtraining risk. Rest recommended.';
}
```

**Storage:** `adaptive_recommendations`

#### Step 5: AI Integration
**Yves Context:**
```
HRV: Current 45ms vs Baseline 51ms (-12.1% deviation) – Risk Zone: YELLOW

User Query: "Should I do my long run tomorrow?"
Yves Response: "Your HRV is 12% below baseline, indicating incomplete recovery.
I recommend replacing tomorrow's long run with an easy 30-minute jog or rest day.
Your body needs more recovery time."
```

**Display:** Dashboard shows HRV trend with color-coded indicator

---

### Readiness Score

**Purpose:** Composite score combining recovery, sleep, and activity balance

**Data Source:** Oura API v2 - `/daily_readiness` endpoint

**Complete Journey:**

#### Step 1: Raw Data
```json
{
  "day": "2025-11-02",
  "score": 78,
  "contributors": {
    "activity_balance": 85,
    "body_temperature": 72,
    "hrv_balance": 65,
    "previous_day_activity": 80,
    "previous_night": 88,
    "recovery_index": 70,
    "resting_heart_rate": 82,
    "sleep_balance": 75
  }
}
```

#### Step 2: Storage
**Table:** `wearable_sessions.readiness_score`

```sql
INSERT INTO wearable_sessions (user_id, date, source, readiness_score)
VALUES ('user-uuid', '2025-11-02', 'oura', 78);
```

#### Step 3: 7-Day Average Calculation
**Location:** `fetch-oura-auto` Edge Function (lines 307-309)

```typescript
const avgReadiness = last7Days.reduce((sum, s) =>
  sum + (s.readiness_score || 0), 0
) / last7Days.length;
```

**Storage:** `wearable_summary.readiness_index`

#### Step 4: Interpretation
- **< 70:** Poor readiness (rest or recovery day)
- **70-85:** Moderate readiness (normal training OK)
- **> 85:** Excellent readiness (can push hard)

#### Step 5: Baseline & Risk
**Baseline:** 30-day average (e.g., 82)
**Current:** 65
**Deviation:** -20.7% (RED zone)

**AI Coaching:**
```
Readiness: 65/100 (20% below your baseline of 82)
Contributors: HRV balance (65), Recovery index (70) are low
Recommendation: Light training only. Focus on sleep and stress management.
```

---

### Sleep Score

**Purpose:** Sleep quality assessment for recovery planning

**Data Source:** Oura API v2 - `/daily_sleep` endpoint

**Complete Journey:**

#### Step 1: Raw Data
```json
{
  "day": "2025-11-02",
  "score": 82,
  "contributors": {
    "deep_sleep": 90,
    "efficiency": 85,
    "latency": 75,
    "rem_sleep": 88,
    "restfulness": 70,
    "timing": 80,
    "total_sleep": 85
  },
  "total_sleep_duration": 28800  // seconds (8 hours)
}
```

#### Step 2: Storage
**Table:** `wearable_sessions.sleep_score`

```sql
INSERT INTO wearable_sessions (user_id, date, source, sleep_score)
VALUES ('user-uuid', '2025-11-02', 'oura', 82);
```

#### Step 3: 7-Day Average
**Storage:** `wearable_summary.avg_sleep_score`

```typescript
const avgSleep = last7Days.reduce((sum, s) =>
  sum + (s.sleep_score || 0), 0
) / last7Days.length;
```

#### Step 4: Sleep Duration Tracking
**User Profile:** `user_recovery.sleep_hours` (goal: 8 hours)
**Actual:** 8 hours (from total_sleep_duration)

#### Step 5: Risk Assessment
**Baseline:** 85 (30-day average)
**Current:** 72
**Deviation:** -15.3% (YELLOW zone)

**AI Context:**
```
Sleep Score: 72/100 (15% below baseline)
Low Contributors: Restfulness (70), Latency (75)
Duration: 8h (meets goal)
Quality: Suboptimal - interrupted sleep detected

Recommendation: Review sleep environment (temperature, light, noise).
Consider earlier bedtime to improve sleep onset.
```

---

## Data Transformation Pipeline

### Pipeline Overview

```
Raw Data (Oura API)
    ↓
Fetch & Parse (fetch-oura-auto)
    ↓
Calculate Metrics (Training Load, ACWR, Strain, Monotony)
    ↓
Store Sessions (wearable_sessions)
    ↓
Store Summary (wearable_summary)
    ↓
Calculate Baselines (30-day rolling avg)
    ↓
Detect Deviations (current vs baseline)
    ↓
Assign Risk Zones (green/yellow/red)
    ↓
Generate Recommendations (adaptive_recommendations)
    ↓
Load AI Context (yves-chat)
    ↓
Display to User (Dashboard, Chat, Insights)
```

### Transformation Rules

| Input | Transformation | Output | Storage |
|-------|---------------|--------|---------|
| activity_score, steps | `score × (steps/10000)` | training_load | wearable_summary |
| 7-day loads | Sum | strain | wearable_summary |
| 7-day loads | mean / std | monotony | wearable_summary |
| 7-day avg, 28-day avg | acute / chronic | acwr | wearable_summary |
| 30-day metric values | Average | baseline | user_baselines |
| current, baseline | `((current-baseline)/baseline)×100` | deviation_pct | adaptive_recommendations |
| deviation_pct | Threshold logic | risk_zone | adaptive_recommendations |

---

## Risk Zone Calculation

### Standard Risk Thresholds

```typescript
function calculateRiskZone(deviation: number): string {
  const absDeviation = Math.abs(deviation);

  if (absDeviation < 10) return 'green';   // Low risk
  if (absDeviation < 25) return 'yellow';  // Moderate risk
  return 'red';                            // High risk
}
```

### Context-Aware Adjustments

**Training Phase Modulation:**

```typescript
// Peak training phase - allow higher strain
if (trainingPhase === 'peak' && metric === 'strain') {
  if (absDeviation < 15) return 'green';   // Relaxed threshold
  if (absDeviation < 30) return 'yellow';
  return 'red';
}

// Base building - strict recovery monitoring
if (trainingPhase === 'base' && metric === 'hrv') {
  if (absDeviation < 8) return 'green';    // Stricter threshold
  if (absDeviation < 20) return 'yellow';
  return 'red';
}
```

**Medical Condition Modulation:**

```typescript
// User has asthma - stricter HRV monitoring
if (medicalConditions.includes('asthma') && metric === 'hrv') {
  thresholds = { green: 8, yellow: 15 };  // Tighter than standard 10/25
}

// User recovering from injury - monitor acute load closely
if (recentInjuries.length > 0 && metric === 'acute_load') {
  thresholds = { green: 5, yellow: 15 };  // Very conservative
}
```

**Implementation:** See `calculate-deviation` lines 98-150

---

## AI Context Integration

### Context Assembly Process

**Function:** `yves-chat` Edge Function

**Step 1: Load All Context Sources**

```typescript
// 1. User Profile & Preferences
const { data: userContext } = await supabase
  .from('user_context_enhanced')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

// 2. Health Profile (AI-synthesized)
const { data: healthProfile } = await supabase
  .from('user_health_profiles')
  .select('profile_data, ai_synthesis')
  .eq('user_id', userId)
  .order('generated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

// 3. Recent Wearable Data (14 days)
const { data: wearableData } = await supabase
  .from('wearable_sessions')
  .select('*')
  .eq('user_id', userId)
  .gte('date', fourteenDaysAgo)
  .order('date', { ascending: false });

// 4. Risk Zones & Deviations
const { data: recommendations } = await supabase
  .from('adaptive_recommendations')
  .select('*')
  .eq('user_id', userId)
  .order('generated_at', { ascending: false })
  .limit(10);

// 5. Long-Term Memory
const { data: memoryBank } = await supabase
  .from('yves_memory_bank')
  .select('memory_key, memory_value')
  .eq('user_id', userId);

// 6. Conversation History (last 5)
const { data: recentHistory } = await supabase
  .from('insight_history')
  .select('query, response')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5);
```

**Step 2: Format Baseline & Risk Analysis**

```typescript
const baselineContext = recommendations
  .map(r => `${r.metric}: Current ${r.current_value} vs Baseline ${r.baseline_value} (${r.deviation_pct}% deviation) – Risk Zone: ${r.risk_level}`)
  .join('\n');
```

**Example Output:**
```
ACWR: Current 1.37 vs Baseline 1.06 (+29.2% deviation) – Risk Zone: RED
HRV: Current 45ms vs Baseline 51ms (-12.1% deviation) – Risk Zone: YELLOW
Strain: Current 850 vs Baseline 720 (+18% deviation) – Risk Zone: YELLOW
```

**Step 3: Assemble AI Prompt**

```typescript
const systemPrompt = `You are Yves, an AI health coach specializing in endurance training, recovery optimization, and injury prevention. You have access to the user's complete health context, wearable data, and baseline analysis.

CRITICAL INSTRUCTIONS:
- Prioritize metrics in RED risk zones
- Provide specific, actionable recommendations
- Reference user's goals and training phase
- Consider medical conditions and injury history
- Use conversational, empathetic tone`;

const userPrompt = `
BASELINE & RISK ANALYSIS:
${baselineContext}

RECENT WEARABLE DATA (7-day summary):
Readiness: ${avgReadiness}/100
Sleep Score: ${avgSleep}/100
HRV: ${avgHRV} ms
Resting HR: ${avgRestingHR} bpm

USER PROFILE:
Goals: ${userProfile.goals}
Training Phase: ${trainingPhase}
Recent Injuries: ${injuries}
Activity Level: ${activityLevel}

LONG-TERM MEMORY:
${memoryContext}

CONVERSATION HISTORY:
${conversationHistory}

USER QUERY:
${query}
`;
```

**Step 4: OpenAI API Call**

```typescript
const ai = getAIProvider();
const aiResponse = await ai.chat({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]
});
```

**Step 5: Store Response**

```sql
INSERT INTO insight_history (user_id, query, response, context_used)
VALUES ('user-uuid', 'Should I train today?', 'Based on your RED zone ACWR...', jsonb_build_object(...));
```

---

## Example: Complete Data Journey

**Scenario:** User asks "Should I do my long run tomorrow?"

### Data Collected (Last 14 Days)

| Date | Activity Score | Steps | Sleep Score | HRV | Readiness |
|------|---------------|-------|-------------|-----|-----------|
| 10/20 | 85 | 12000 | 82 | 52 | 78 |
| 10/21 | 90 | 14000 | 80 | 50 | 75 |
| ... | ... | ... | ... | ... | ... |
| 11/02 | 88 | 13500 | 72 | 45 | 65 |

### Calculations Performed

**Training Load (11/02):**
```
88 × (13500 / 10000) = 118.8
```

**7-Day Strain:**
```
105 + 126 + 115 + 100 + 118 + 122 + 118.8 = 804.8
```

**7-Day Monotony:**
```
Mean = 115, Std = 9.5
Monotony = 115 / 9.5 = 12.1 (Good variety)
```

**ACWR:**
```
Acute (7-day): 115
Chronic (28-day): 105
ACWR = 115 / 105 = 1.10 (Optimal)
```

**Baselines (30-day):**
- HRV Baseline: 51 ms
- Readiness Baseline: 82
- Sleep Baseline: 85

**Deviations:**
- HRV: 45 vs 51 = -11.8% (YELLOW)
- Readiness: 65 vs 82 = -20.7% (RED)
- Sleep: 72 vs 85 = -15.3% (YELLOW)

### AI Response Generated

```
Based on your current data, I recommend **postponing** your long run tomorrow. Here's why:

🔴 **Readiness is 21% below your baseline** (65 vs your usual 82), indicating significant fatigue.

🟡 **HRV has dropped 12%** (45ms vs 51ms baseline), suggesting incomplete recovery.

🟡 **Sleep quality is down 15%**, with interrupted sleep patterns detected.

However, your ACWR (1.10) is in the optimal zone, so this isn't about overtraining - it's about acute recovery debt.

**Recommendation:** Replace tomorrow's long run with either:
1. Complete rest day, or
2. Easy 30-minute recovery jog (keep HR < 140 bpm)

Re-assess on Friday. If readiness rebounds above 75, you can do your long run this weekend.

**Recovery priorities:** Focus on sleep hygiene tonight (cool room, no screens 1hr before bed) and consider adding 15 minutes of meditation or deep breathing.
```

### User Display

**Dashboard:**
- Readiness: 65 (RED indicator)
- HRV: 45ms (YELLOW indicator with downward trend arrow)
- Sleep: 72 (YELLOW indicator)

**Yves Recommendations Card:**
- "Recovery Alert: Consider rest or easy training today"

**Health Page - Trends:**
- HRV 7-day chart showing decline
- Readiness 14-day chart with baseline overlay

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Function reference
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Table schemas

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
