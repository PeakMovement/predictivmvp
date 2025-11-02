# Database Schema Reference

> Complete documentation of all database tables, relationships, and Row Level Security policies in the Predictiv platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Design Principles](#schema-design-principles)
3. [Core Tables](#core-tables)
4. [Wearable Data Tables](#wearable-data-tables)
5. [User Profile Tables](#user-profile-tables)
6. [AI & Intelligence Tables](#ai--intelligence-tables)
7. [Analysis & Calculation Tables](#analysis--calculation-tables)
8. [Notification & Logging Tables](#notification--logging-tables)
9. [Table Relationships](#table-relationships)
10. [Row Level Security (RLS)](#row-level-security-rls)

---

## Overview

**Database:** PostgreSQL (Supabase-managed)
**Total Tables:** 35+
**Security:** Row Level Security (RLS) enabled on all user data tables
**Versioning:** Managed via Supabase migrations

**Key Characteristics:**
- User data isolated by `user_id` (UUID from Supabase Auth)
- Timestamps (`created_at`, `updated_at`) on all tables
- JSONB columns for flexible structured data
- Composite unique constraints for deduplication
- Foreign key relationships for data integrity

---

## Schema Design Principles

### 1. User Data Isolation
Every user-data table includes:
```sql
user_id UUID REFERENCES auth.users(id) NOT NULL
```

### 2. Temporal Tracking
```sql
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

### 3. Flexible Storage
```sql
-- For structured but varying data
data JSONB
profile_data JSONB
insight_data JSONB
```

### 4. Upsert Support
```sql
-- Unique constraints enable conflict resolution
UNIQUE(user_id, date, source)  -- wearable_sessions
UNIQUE(user_id, metric, data_window)  -- user_baselines
```

### 5. RLS by Default
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own data"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

---

## Core Tables

### auth.users (Supabase Auth)
**Purpose:** User authentication and identity
**Managed By:** Supabase Auth system

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, referenced as `user_id` |
| email | TEXT | User's email address |
| encrypted_password | TEXT | Hashed password |
| email_confirmed_at | TIMESTAMPTZ | Email verification timestamp |
| created_at | TIMESTAMPTZ | Account creation |
| raw_user_meta_data | JSONB | User-editable metadata |
| raw_app_meta_data | JSONB | System metadata |

**Note:** This table is not directly modified by application code

---

## Wearable Data Tables

### wearable_sessions
**Purpose:** Store raw daily metrics from wearable devices

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL | References auth.users |
| date | DATE | NOT NULL | Metric date |
| source | TEXT | NOT NULL | Device type (oura, fitbit) |
| readiness_score | NUMERIC | NULL | Overall readiness (0-100) |
| sleep_score | NUMERIC | NULL | Sleep quality (0-100) |
| activity_score | NUMERIC | NULL | Activity level (0-100) |
| total_steps | INTEGER | NULL | Daily step count |
| total_calories | INTEGER | NULL | Active calories burned |
| resting_hr | NUMERIC | NULL | Resting heart rate (bpm) |
| hrv_avg | NUMERIC | NULL | Average HRV (ms) |
| spo2_avg | NUMERIC | NULL | Average blood oxygen (%) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last update |

**Unique Constraint:** `(user_id, source, date)`

**RLS Policies:**
```sql
-- Users can view own sessions
CREATE POLICY "view_own_sessions" ON wearable_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own sessions
CREATE POLICY "insert_own_sessions" ON wearable_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can manage all
CREATE POLICY "service_manage_all" ON wearable_sessions
  USING (true) TO service_role;
```

**Indexes:**
```sql
CREATE INDEX idx_wearable_sessions_user_date ON wearable_sessions(user_id, date DESC);
CREATE INDEX idx_wearable_sessions_source ON wearable_sessions(source);
```

---

### wearable_summary
**Purpose:** Store calculated metrics (ACWR, Strain, Monotony)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL | References auth.users |
| date | DATE | NOT NULL | Calculation date |
| source | TEXT | NOT NULL | Device type |
| strain | NUMERIC | NULL | 7-day training load sum |
| monotony | NUMERIC | NULL | Training variety (mean/std) |
| acwr | NUMERIC | NULL | Acute:Chronic workload ratio |
| readiness_index | NUMERIC | NULL | 7-day readiness average |
| avg_sleep_score | NUMERIC | NULL | 7-day sleep average |
| created_at | TIMESTAMPTZ | DEFAULT now() | Record creation |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last update |

**Unique Constraint:** `(user_id, source, date)`

**Calculation Details:**
- **Strain:** Sum of training loads over 7 days
- **Monotony:** Mean / Standard Deviation of 7-day loads
- **ACWR:** (7-day avg load) / (28-day avg load)
- **Readiness Index:** Average readiness score (7 days)

---

### oura_tokens
**Purpose:** Store Oura Ring OAuth credentials

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | UNIQUE, NOT NULL | References auth.users |
| access_token | TEXT | NOT NULL | OAuth access token (encrypted) |
| refresh_token | TEXT | NOT NULL | OAuth refresh token (encrypted) |
| expires_at | TIMESTAMPTZ | NOT NULL | Token expiration |
| created_at | TIMESTAMPTZ | DEFAULT now() | Initial connection |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last refresh |

**RLS Policies:**
```sql
-- Users can only view/update their own tokens
CREATE POLICY "own_tokens_only" ON oura_tokens
  FOR ALL USING (auth.uid() = user_id);
```

**Security Notes:**
- Tokens encrypted at rest
- Never exposed in API responses
- Automatic refresh before expiration

---

### oura_logs
**Purpose:** Track Oura sync operations for debugging

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL | References auth.users |
| status | TEXT | NOT NULL | success, error, pending |
| entries_synced | INTEGER | NULL | Number of records synced |
| error_message | TEXT | NULL | Error details if failed |
| created_at | TIMESTAMPTZ | DEFAULT now() | Log timestamp |

**Retention:** 30 days (automatic cleanup)

**Query Example:**
```sql
-- Get recent sync status for user
SELECT status, entries_synced, created_at
FROM oura_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

---

### training_trends (formerly fitbit_trends)
**Purpose:** Historical wearable data for baseline calculations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | References auth.users |
| date | DATE | Metric date |
| hrv | NUMERIC | Heart rate variability |
| acwr | NUMERIC | Acute:Chronic workload ratio |
| ewma | NUMERIC | Exponentially weighted moving avg |
| strain | NUMERIC | Training strain |
| monotony | NUMERIC | Training monotony |
| training_load | NUMERIC | Daily training load |
| acute_load | NUMERIC | 7-day average load |
| chronic_load | NUMERIC | 28-day average load |
| sleep_score | NUMERIC | Sleep quality score |

**Unique Constraint:** `(user_id, date)`

**Note:** This table is being phased out in favor of `wearable_summary`

---

## User Profile Tables

The profile system is split into 10 specialized tables for modularity:

### 1. user_profile
**Purpose:** Core personal information

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY, References auth.users |
| name | TEXT | Full name |
| dob | DATE | Date of birth |
| gender | TEXT | Gender identity |
| activity_level | TEXT | Low, Moderate, High |
| created_at | TIMESTAMPTZ | Profile creation |
| updated_at | TIMESTAMPTZ | Last modification |

---

### 2. user_injuries
**Purpose:** Injury history and details

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| injuries | TEXT[] | Array of injury names |
| injury_details | JSONB | Structured details per injury |
| created_at | TIMESTAMPTZ | Record creation |
| updated_at | TIMESTAMPTZ | Last update |

**Example `injury_details`:**
```json
{
  "left_knee": {
    "type": "strain",
    "severity": "moderate",
    "date": "2023-11-15",
    "status": "recovering",
    "restrictions": ["no hills", "limit mileage"]
  }
}
```

---

### 3. user_lifestyle
**Purpose:** Daily routine and habits

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| daily_routine | TEXT | Description of typical day |
| work_schedule | TEXT | Work hours/pattern |
| stress_level | TEXT | Low, Moderate, High |

---

### 4. user_interests
**Purpose:** Hobbies and interests

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| hobbies | TEXT[] | Array of hobbies |
| interests | TEXT[] | Array of general interests |

---

### 5. user_nutrition
**Purpose:** Dietary habits and restrictions

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| diet_type | TEXT | Vegetarian, Keto, Balanced, etc. |
| allergies | TEXT[] | Food/ingredient allergies |
| eating_pattern | TEXT | Meal timing, IF, etc. |

---

### 6. user_training
**Purpose:** Training preferences

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| preferred_activities | TEXT[] | Running, cycling, swimming |
| training_frequency | TEXT | 1-2x/week, 3-4x/week, etc. |
| intensity_preference | TEXT | Low, Moderate, High, Variable |

---

### 7. user_medical
**Purpose:** Medical conditions and medications

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| conditions | TEXT[] | Diagnosed conditions |
| medications | TEXT[] | Current medications |
| medical_notes | TEXT | Additional notes |

**Security:** Extra RLS policies, healthcare data

---

### 8. user_wellness_goals
**Purpose:** Health and fitness goals

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| goals | TEXT[] | Lose weight, run marathon, etc. |
| target_date | DATE | Goal deadline (optional) |
| priority | TEXT | Low, Medium, High |

---

### 9. user_recovery
**Purpose:** Sleep and recovery habits

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| sleep_hours | NUMERIC | Average sleep duration |
| sleep_quality | TEXT | Poor, Fair, Good, Excellent |
| recovery_methods | TEXT[] | Stretching, massage, ice baths |

---

### 10. user_mindset
**Purpose:** Mental health and motivation

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| motivation_factors | TEXT[] | What drives the user |
| mental_health_focus | TEXT | Areas of focus |
| stress_management | TEXT | Coping strategies |

---

### All Profile Tables Share:
- `user_id UUID PRIMARY KEY`
- `created_at TIMESTAMPTZ DEFAULT now()`
- `updated_at TIMESTAMPTZ DEFAULT now()`
- RLS enabled with `auth.uid() = user_id` policy

---

## AI & Intelligence Tables

### yves_memory_bank
**Purpose:** Long-term memory storage for AI context

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL | References auth.users |
| memory_key | TEXT | NOT NULL | Predefined key (e.g., sleep_goal_hours) |
| memory_value | TEXT | NOT NULL | Stored value (can be JSON string) |
| created_at | TIMESTAMPTZ | DEFAULT now() | First stored |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last updated |

**Unique Constraint:** `(user_id, memory_key)`

**Valid Memory Keys:**
- `personal_info`
- `injury_history`
- `lifestyle_profile`
- `interests_hobbies`
- `nutrition_habits`
- `training_preferences`
- `medical_background`
- `wellness_goals`
- `recovery_sleep`
- `mindset_motivation`

**Update Mechanism:**
```typescript
// Triggered when profile sections saved
await supabase.functions.invoke('yves-memory-update', {
  body: {
    user_id: userId,
    memory_key: 'sleep_goal_hours',
    memory_value: '8'
  }
});
```

---

### insight_history
**Purpose:** Store all Yves AI conversation logs

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL | References auth.users |
| query | TEXT | NOT NULL | User's question |
| response | TEXT | NOT NULL | Yves' answer |
| context_used | JSONB | NULL | Which context sources loaded |
| confidence | NUMERIC | NULL | AI confidence score (0-1) |
| created_at | TIMESTAMPTZ | DEFAULT now() | Conversation timestamp |

**RLS Policies:**
```sql
CREATE POLICY "view_own_history" ON insight_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "service_insert" ON insight_history
  FOR INSERT TO service_role WITH CHECK (true);
```

**Retention:** Indefinite (for conversation continuity)

**Privacy:** Never shared between users, encrypted at rest

---

### user_health_profiles
**Purpose:** AI-synthesized comprehensive health intelligence

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL | References auth.users |
| profile_data | JSONB | NOT NULL | Structured profile summary |
| ai_synthesis | TEXT | NULL | Human-readable summary |
| version | INTEGER | NOT NULL | Incremental version number |
| generated_at | TIMESTAMPTZ | DEFAULT now() | Profile creation timestamp |

**Unique Constraint:** `(user_id, version)`

**Version Management:**
- New profile created when documents analyzed or profile updated
- Previous versions retained for history
- Latest version used for AI context

**`profile_data` Structure:**
```json
{
  "nutrition_summary": {
    "daily_calories": 2800,
    "macros": {"carbs": 55, "protein": 25, "fat": 20},
    "supplements": ["Iron", "Vitamin D"]
  },
  "medical_summary": {
    "active_conditions": ["Asthma"],
    "medications": ["Albuterol"],
    "allergies": ["Peanuts"],
    "contraindications": ["Avoid cold weather high-intensity"]
  },
  "training_summary": {
    "program_name": "Marathon Base Building",
    "current_phase": "Base",
    "weekly_volume_km": 60,
    "goal_race_date": "2026-04-15"
  }
}
```

---

### user_context_enhanced
**Purpose:** Aggregated user preferences for fast AI context loading

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | PRIMARY KEY |
| context_data | JSONB | Aggregated preferences |
| last_updated | TIMESTAMPTZ | Context refresh timestamp |

**Update Trigger:** Whenever profile tables modified

---

### yves_recommendations
**Purpose:** Store proactive AI recommendations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| priority | TEXT | high, medium, low |
| category | TEXT | recovery, training, nutrition, sleep |
| title | TEXT | Short recommendation title |
| description | TEXT | Detailed explanation |
| actionable_steps | TEXT[] | Specific actions |
| generated_at | TIMESTAMPTZ | Creation timestamp |
| dismissed_at | TIMESTAMPTZ | User dismissed (NULL if active) |

**Display:** Dashboard → YvesRecommendationsCard

---

### daily_briefings
**Purpose:** Store morning summary briefings

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| date | DATE | Briefing date |
| briefing_text | TEXT | Generated summary |
| metrics_snapshot | JSONB | Key metrics included |
| generated_at | TIMESTAMPTZ | Creation timestamp |

**Unique Constraint:** `(user_id, date)`

**Generation:** Daily at 6 AM (user's timezone)

---

## Analysis & Calculation Tables

### user_baselines
**Purpose:** Store 30-day rolling averages for each metric

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| user_id | UUID | NOT NULL | References auth.users |
| metric | TEXT | NOT NULL | Metric name (hrv, acwr, etc.) |
| rolling_avg | NUMERIC | NOT NULL | 30-day average value |
| data_window | INTEGER | NOT NULL | Days used (typically 30) |
| calculated_at | TIMESTAMPTZ | DEFAULT now() | Calculation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT now() | Last recalculation |

**Unique Constraint:** `(user_id, metric, data_window)`

**Metrics Tracked:**
- hrv
- acwr
- ewma
- strain
- monotony
- training_load
- acute_load
- chronic_load

**Recalculation:** Hourly via `calculate-baseline` function

---

### adaptive_recommendations
**Purpose:** Store deviation analysis and risk zones

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| metric | TEXT | Metric name |
| baseline_value | NUMERIC | From user_baselines |
| current_value | NUMERIC | Latest measurement |
| deviation_pct | NUMERIC | Percentage deviation |
| risk_status | TEXT | low, moderate, high |
| risk_level | TEXT | green, yellow, red |
| adaptive_suggestion | TEXT | Contextual recommendation |
| reasoning | TEXT | Why this risk level |
| confidence | NUMERIC | Algorithm confidence (0-1) |
| generated_at | TIMESTAMPTZ | Detection timestamp |

**Unique Constraint:** `(user_id, metric)` (upsert latest)

**Risk Calculation:**
```sql
deviation_pct = ((current_value - baseline_value) / baseline_value) * 100

risk_status = CASE
  WHEN ABS(deviation_pct) < 10 THEN 'low'
  WHEN ABS(deviation_pct) < 25 THEN 'moderate'
  ELSE 'high'
END;
```

**Context-Aware Adjustments:** Applied in `calculate-deviation` function

---

### plan_adherence
**Purpose:** Track training plan compliance

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| date_range_start | DATE | Analysis period start |
| date_range_end | DATE | Analysis period end |
| adherence_pct | NUMERIC | Overall compliance (0-100) |
| planned_sessions | INTEGER | Expected sessions |
| completed_sessions | INTEGER | Actual sessions |
| missed_sessions | INTEGER | Skipped sessions |
| details | JSONB | Breakdown by session type |
| calculated_at | TIMESTAMPTZ | Analysis timestamp |

---

## Notification & Logging Tables

### notification_log
**Purpose:** Track all notifications sent

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| notification_type | TEXT | sms, email, push |
| channel | TEXT | Specific service (twilio, sendgrid) |
| message | TEXT | Content sent |
| status | TEXT | sent, failed, pending |
| sent_at | TIMESTAMPTZ | Send timestamp |
| error_message | TEXT | Failure reason (if failed) |

**Retention:** 90 days

**Query for Rate Limiting:**
```sql
-- Count SMS sent today
SELECT COUNT(*)
FROM notification_log
WHERE user_id = 'user-uuid'
  AND notification_type = 'sms'
  AND sent_at > CURRENT_DATE;
```

---

### function_execution_log
**Purpose:** Monitor Edge Function performance

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| function_name | TEXT | Edge Function name |
| status | TEXT | running, success, failed |
| started_at | TIMESTAMPTZ | Invocation start |
| completed_at | TIMESTAMPTZ | Invocation end |
| duration_ms | INTEGER | Execution time |
| error_message | TEXT | Error details (if failed) |
| metadata | JSONB | Additional context |

**Retention:** 30 days

**Monitoring Queries:**
```sql
-- Average execution time by function
SELECT function_name, AVG(duration_ms) as avg_ms
FROM function_execution_log
WHERE status = 'success'
  AND started_at > NOW() - INTERVAL '24 hours'
GROUP BY function_name
ORDER BY avg_ms DESC;

-- Error rate
SELECT function_name,
       COUNT(*) FILTER (WHERE status = 'failed') * 100.0 / COUNT(*) as error_pct
FROM function_execution_log
WHERE started_at > NOW() - INTERVAL '7 days'
GROUP BY function_name;
```

---

### document_processing_log
**Purpose:** Audit document analysis operations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| document_id | UUID | References user_documents |
| processing_status | TEXT | pending, success, failed |
| ai_provider | TEXT | openai, anthropic, etc. |
| tokens_used | INTEGER | AI tokens consumed |
| confidence_score | NUMERIC | Extraction confidence |
| error_details | TEXT | Failure reason (if failed) |
| processed_at | TIMESTAMPTZ | Processing timestamp |

---

## Document Management Tables

### user_documents
**Purpose:** Store uploaded medical/training documents

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| document_type | TEXT | medical, nutrition, training |
| file_name | TEXT | Original filename |
| file_url | TEXT | Supabase storage URL |
| file_size | INTEGER | Size in bytes |
| mime_type | TEXT | File MIME type |
| upload_date | TIMESTAMPTZ | Upload timestamp |
| processed | BOOLEAN | Analysis completed |

**Storage:** Supabase Storage bucket `user-documents`

**RLS:** Users can only access their own documents

---

### document_insights
**Purpose:** Store AI-extracted structured data from documents

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | References auth.users |
| document_id | UUID | References user_documents |
| insight_type | TEXT | medical, nutrition, training |
| insight_data | JSONB | Extracted structured data |
| confidence | NUMERIC | Extraction confidence (0-1) |
| created_at | TIMESTAMPTZ | Extraction timestamp |

**Foreign Key:**
```sql
FOREIGN KEY (document_id) REFERENCES user_documents(id) ON DELETE CASCADE
```

---

## Table Relationships

### Entity Relationship Diagram

```
auth.users (Supabase Auth)
    ↓
    ├──> wearable_sessions (1:many)
    │       ↓
    │       └──> wearable_summary (calculated from sessions)
    │
    ├──> oura_tokens (1:1)
    │
    ├──> user_profile (1:1)
    ├──> user_injuries (1:1)
    ├──> user_lifestyle (1:1)
    ├──> user_interests (1:1)
    ├──> user_nutrition (1:1)
    ├──> user_training (1:1)
    ├──> user_medical (1:1)
    ├──> user_wellness_goals (1:1)
    ├──> user_recovery (1:1)
    ├──> user_mindset (1:1)
    │       ↓ (aggregated)
    │       └──> user_context_enhanced (1:1)
    │       └──> yves_memory_bank (1:many)
    │
    ├──> user_documents (1:many)
    │       ↓
    │       └──> document_insights (1:many)
    │                   ↓
    │                   └──> user_health_profiles (versioned synthesis)
    │
    ├──> user_baselines (1:many, by metric)
    │       ↓
    │       └──> adaptive_recommendations (1:many, by metric)
    │
    ├──> insight_history (1:many)
    ├──> yves_recommendations (1:many)
    ├──> daily_briefings (1:many)
    ├──> plan_adherence (1:many)
    │
    └──> notification_log (1:many)
         oura_logs (1:many)
         function_execution_log (1:many)
         document_processing_log (1:many)
```

---

## Row Level Security (RLS)

### Standard User Data Policy Pattern

```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view their own data
CREATE POLICY "Users view own data"
  ON table_name FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: Users can insert their own data
CREATE POLICY "Users insert own data"
  ON table_name FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users can update their own data
CREATE POLICY "Users update own data"
  ON table_name FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can delete their own data
CREATE POLICY "Users delete own data"
  ON table_name FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role: Full access for Edge Functions
CREATE POLICY "Service role manages all"
  ON table_name FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

### Special Cases

**insight_history (Read-only for users):**
```sql
-- Users can read their conversation history
CREATE POLICY "view_own_history" ON insight_history
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert (via Edge Functions)
CREATE POLICY "service_insert" ON insight_history
  FOR INSERT TO service_role WITH CHECK (true);
```

**oura_tokens (Extra protection):**
```sql
-- Users can view existence but not token values
CREATE POLICY "own_tokens_metadata" ON oura_tokens
  FOR SELECT USING (
    auth.uid() = user_id AND
    -- Return only non-sensitive columns in application query
  );

-- Service role handles all token operations
```

### Testing RLS Policies

```sql
-- Test as specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid';

-- Verify can only see own data
SELECT * FROM wearable_sessions;  -- Should only return user's rows

-- Verify cannot see others' data
SELECT * FROM wearable_sessions WHERE user_id != 'user-uuid';  -- Empty

-- Reset
RESET ROLE;
```

---

## Indexes

### Performance-Critical Indexes

```sql
-- Wearable data queries (by user and date)
CREATE INDEX idx_wearable_sessions_user_date
  ON wearable_sessions(user_id, date DESC);

CREATE INDEX idx_wearable_summary_user_date
  ON wearable_summary(user_id, date DESC);

-- Baseline lookups
CREATE INDEX idx_user_baselines_user_metric
  ON user_baselines(user_id, metric);

-- Deviation queries
CREATE INDEX idx_adaptive_recommendations_user
  ON adaptive_recommendations(user_id, generated_at DESC);

-- Conversation history
CREATE INDEX idx_insight_history_user_created
  ON insight_history(user_id, created_at DESC);

-- Document insights
CREATE INDEX idx_document_insights_user_type
  ON document_insights(user_id, insight_type);
```

---

## Migrations

### Migration File Naming Convention
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20251102150000_create_wearable_sessions_table.sql`

### Migration Best Practices

1. **Idempotent Operations:**
```sql
CREATE TABLE IF NOT EXISTS table_name (...);
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TYPE;
```

2. **Always Enable RLS:**
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

3. **Include Comments:**
```sql
/*
  # Migration Title

  1. New Tables
    - `table_name` - Description
      - `column1` - Purpose
      - `column2` - Purpose

  2. Security
    - Enable RLS on `table_name`
    - Add policies for authenticated users

  3. Indexes
    - Add index on (user_id, date) for performance
*/
```

4. **Avoid Destructive Operations:**
- Never use `DROP TABLE` or `DROP COLUMN` in production
- Use `ALTER TABLE ... ALTER COLUMN ... TYPE` carefully (may require data migration)

---

## Database Maintenance

### Vacuum & Analyze
Supabase handles automatic vacuum, but manual triggers available:
```sql
VACUUM ANALYZE wearable_sessions;
```

### Table Sizes
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Growth Monitoring
```sql
-- Row counts by table
SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

---

## Backup & Recovery

**Automatic Backups:** Supabase provides daily automatic backups (retention depends on plan)

**Manual Backup:**
```bash
# Via Supabase CLI
supabase db dump -f backup.sql

# Restore
psql -h db.project.supabase.co -U postgres -d postgres -f backup.sql
```

**Point-in-Time Recovery:** Available on Supabase Pro plan

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [DATA_FLOW.md](./DATA_FLOW.md) - Metric calculation journeys
- [EDGE_FUNCTIONS.md](./EDGE_FUNCTIONS.md) - Function reference

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
