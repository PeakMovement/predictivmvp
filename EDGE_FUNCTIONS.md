# Edge Functions Reference

> Complete documentation of all Supabase Edge Functions in the Predictiv platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Function Categories](#function-categories)
3. [Wearable Data Functions](#wearable-data-functions)
4. [Calculation & Analysis Functions](#calculation--analysis-functions)
5. [AI & Intelligence Functions](#ai--intelligence-functions)
6. [Authentication Functions](#authentication-functions)
7. [Document Processing Functions](#document-processing-functions)
8. [Notification Functions](#notification-functions)
9. [Utility Functions](#utility-functions)
10. [Deployment & Testing](#deployment--testing)

---

## Overview

**Runtime:** Deno (TypeScript/JavaScript)
**Hosting:** Supabase Edge Functions
**Timeout:** 2 minutes (120 seconds)
**Invocation:** HTTP requests, Cron jobs, Database triggers

**Common Patterns:**
- All functions use CORS headers for web access
- Service role key for admin operations
- User authentication via JWT tokens
- Comprehensive error logging

---

## Function Categories

| Category | Functions | Purpose |
|----------|-----------|---------|
| **Wearable Data** | fetch-oura-auto, fetch-oura-data, wearable-diagnostics | Sync & debug wearable data |
| **Calculations** | calculate-baseline, calculate-deviation, calculate-plan-adherence | Metric analysis |
| **AI Intelligence** | yves-chat, yves-tree, yves-memory-update, generate-yves-recommendations | AI coaching |
| **Authentication** | oura-auth, oura-auth-initiate | OAuth flows |
| **Documents** | analyze-document, build-health-profile | Document intelligence |
| **Notifications** | send-sms-alert, email-preferences, generate-daily-briefing | User alerts |
| **Utilities** | health-check, test-twilio-env, lovable-ai-credits | Testing & monitoring |

---

## Wearable Data Functions

### fetch-oura-auto

**Purpose:** Automated hourly sync of Oura Ring data for all users

**Trigger:**
- Supabase Cron (hourly)
- Manual invocation via API

**Input:**
```json
{
  "user_id": "optional-user-uuid"  // If omitted, syncs all users
}
```

**Process:**
1. Fetch all users with `oura_tokens` (or specific user)
2. Check token expiration, refresh if needed
3. Fetch data from Oura API v2:
   - `/daily_readiness` (last 14 days)
   - `/daily_sleep` (last 14 days)
   - `/daily_activity` (last 14 days)
4. Calculate metrics:
   - Training Load = `activity_score × (steps / 10000)`
   - Strain = 7-day load sum
   - Monotony = mean / std of 7-day loads
   - ACWR = acute (7-day) / chronic (28-day)
5. Upsert to `wearable_sessions` table
6. Upsert to `wearable_summary` table
7. Log success/failure to `oura_logs`

**Output:**
```json
{
  "success": true,
  "users_processed": 3,
  "total_entries": 42
}
```

**Tables Modified:**
- `wearable_sessions` (upsert by user_id, source, date)
- `wearable_summary` (upsert by user_id, source, date)
- `oura_logs` (insert)
- `oura_tokens` (update if refreshed)

**Error Handling:**
- Token refresh failures logged to `oura_logs`
- Per-user errors don't block other users
- Network timeouts retry once

**Performance:**
- ~5-10 seconds per user
- Parallel API calls where possible
- Batch database operations

---

### fetch-oura-data

**Purpose:** Manual sync of Oura data for a specific user and date range

**Trigger:** Manual API invocation

**Input:**
```json
{
  "user_id": "user-uuid",
  "start_date": "2025-10-01",  // Optional, defaults to 14 days ago
  "end_date": "2025-11-02"     // Optional, defaults to today
}
```

**Process:**
Similar to `fetch-oura-auto` but for specific date range

**Output:**
```json
{
  "success": true,
  "entries_synced": 14,
  "date_range": {
    "start": "2025-10-01",
    "end": "2025-11-02"
  }
}
```

**Use Cases:**
- Backfill historical data
- Re-sync specific date range
- Debugging sync issues

---

### wearable-diagnostics

**Purpose:** Debug wearable data sync issues

**Trigger:** Manual API invocation

**Input:**
```json
{
  "user_id": "user-uuid"
}
```

**Process:**
1. Check if user has valid tokens
2. Test Oura API connectivity
3. Verify token refresh flow
4. Check data availability for last 7 days
5. Inspect database records

**Output:**
```json
{
  "token_status": "valid",
  "api_connectivity": "ok",
  "last_sync": "2025-11-02T10:30:00Z",
  "data_coverage": {
    "days_with_data": 14,
    "missing_dates": []
  },
  "recent_errors": []
}
```

**Tables Queried:**
- `oura_tokens`
- `wearable_sessions`
- `oura_logs`

---

## Calculation & Analysis Functions

### calculate-baseline

**Purpose:** Calculate 30-day rolling averages for all metrics

**Trigger:**
- Supabase Cron (hourly recommended)
- Manual invocation

**Input:** None (processes all users)

**Process:**
1. Fetch last 30 days from `fitbit_trends` (legacy name, actually training_trends)
2. Group by user_id
3. Calculate rolling average for 8 metrics:
   - HRV
   - ACWR
   - EWMA (Exponentially Weighted Moving Average)
   - Strain
   - Monotony
   - Training Load
   - Acute Load
   - Chronic Load
4. Upsert to `user_baselines` table

**Formula:**
```typescript
baseline = sum(values) / count(values)
```

**Output:**
```json
{
  "success": true,
  "records_processed": 450,
  "baselines_created": 24,
  "duration_ms": 1250
}
```

**Tables Modified:**
- `user_baselines` (upsert by user_id, metric, data_window)

**Tables Queried:**
- `fitbit_trends` (or `training_trends`)

**Logging:**
- `function_execution_log` (status, duration, metadata)

**Performance Consideration:**
- Only calculates for users with 30+ days of data
- Skips metrics with insufficient data points

---

### calculate-deviation

**Purpose:** Compare current metrics against baselines and assign risk zones

**Trigger:**
- Supabase Cron (hourly recommended)
- Manual invocation after baseline calculation

**Input:** None (processes all users)

**Process:**
1. Fetch last 7 days from `fitbit_trends`
2. Fetch baselines from `user_baselines`
3. Fetch health profiles for context-aware risk assessment
4. For each user's most recent data:
   - Calculate deviation: `((current - baseline) / baseline) × 100`
   - Determine risk status:
     - `< 10%` → low
     - `10-25%` → moderate
     - `> 25%` → high
   - Apply context-aware adjustments (training phase, medical conditions)
   - Generate adaptive suggestions
5. Upsert to `adaptive_recommendations` table

**Risk Adjustment Logic:**
```typescript
// Example: Peak training phase allows higher strain
if (trainingPhase === 'peak' && metric === 'strain') {
  thresholds = { low: 15, moderate: 30 };  // vs standard 10/25
}

// User has asthma - stricter HRV monitoring
if (medicalConditions.includes('asthma') && metric === 'hrv') {
  thresholds = { low: 8, moderate: 15 };  // vs standard 10/25
}
```

**Output:**
```json
{
  "success": true,
  "users_analyzed": 15,
  "deviations_detected": 45,
  "high_risk_alerts": 3,
  "duration_ms": 2100
}
```

**Tables Modified:**
- `adaptive_recommendations` (upsert by user_id, metric)

**Tables Queried:**
- `fitbit_trends`
- `user_baselines`
- `user_health_profiles`

**Logging:**
- `function_execution_log`

**AI Integration:**
- Recommendations fed into `yves-chat` context
- High-risk metrics prioritized in coaching

---

### calculate-plan-adherence

**Purpose:** Track how well user follows prescribed training plans

**Trigger:** Manual or scheduled

**Input:**
```json
{
  "user_id": "user-uuid",
  "date_range": {
    "start": "2025-10-01",
    "end": "2025-11-02"
  }
}
```

**Process:**
1. Fetch prescribed plan from `training_plans` table
2. Fetch actual training from `wearable_sessions`
3. Compare:
   - Planned vs actual training days
   - Planned vs actual volume (steps, duration)
   - Planned vs actual intensity (activity scores)
4. Calculate adherence percentage
5. Store in `plan_adherence` table

**Formula:**
```typescript
adherence = (completed_sessions / planned_sessions) × 100
```

**Output:**
```json
{
  "adherence_pct": 85,
  "planned_sessions": 20,
  "completed_sessions": 17,
  "missed_sessions": 3,
  "details": {
    "intensity_match": 90,
    "volume_match": 88,
    "timing_match": 82
  }
}
```

**Tables Modified:**
- `plan_adherence`

**Tables Queried:**
- `training_plans`
- `wearable_sessions`

---

## AI & Intelligence Functions

### yves-chat

**Purpose:** AI-powered health coaching with full context awareness

**Authentication:** Required (JWT token)

**Input:**
```json
{
  "query": "Should I do my long run tomorrow?"
}
```

**Process:**
1. Authenticate user via JWT token
2. Load context from 6 sources:
   - `user_context_enhanced` - User preferences
   - `user_health_profiles` - AI-synthesized health intelligence
   - `wearable_sessions` - Last 14 days of metrics
   - `adaptive_recommendations` - Current risk zones
   - `yves_memory_bank` - Long-term memory
   - `insight_history` - Last 5 conversations
3. Format AI prompt with:
   - System identity (health coach)
   - Baseline & risk analysis
   - User profile & goals
   - Conversation history
   - User query
4. Call OpenAI API (or configured provider)
5. Store response in `insight_history`
6. Return formatted response

**AI Prompt Structure:**
```
SYSTEM: You are Yves, an AI health coach...

BASELINE & RISK ANALYSIS:
ACWR: Current 1.37 vs Baseline 1.06 (+29.2%) – Risk: RED
HRV: Current 45ms vs Baseline 51ms (-12.1%) – Risk: YELLOW

USER CONTEXT:
Goals: Marathon in 6 months
Training Phase: Base building
Recent Injuries: Left knee strain

CONVERSATION HISTORY:
[Last 5 exchanges]

USER QUERY:
Should I do my long run tomorrow?
```

**Output:**
```json
{
  "response": "Based on your RED zone ACWR and YELLOW HRV, I recommend postponing your long run. Here's why...",
  "confidence": 0.92,
  "sources_used": ["adaptive_recommendations", "wearable_sessions", "user_health_profiles"],
  "follow_up_suggestions": ["Check tomorrow's readiness", "Consider easy recovery run instead"]
}
```

**Tables Modified:**
- `insight_history` (insert)

**Tables Queried:**
- All 6 context sources

**Performance:**
- Context loading: ~200-300ms
- OpenAI API call: ~2-5 seconds
- Total: ~3-6 seconds

**Error Handling:**
- Missing context sources gracefully handled
- AI provider failures logged
- Fallback responses if AI unavailable

---

### yves-tree

**Purpose:** Generate hierarchical insight tree visualization

**Authentication:** Required

**Input:**
```json
{
  "user_id": "optional-if-auth-provided",
  "depth": 3,  // How many levels deep
  "start_date": "2025-10-01"
}
```

**Process:**
1. Fetch insights from `insight_history`
2. Categorize by topic (training, recovery, nutrition, etc.)
3. Build hierarchical structure
4. Calculate insight confidence scores
5. Identify trends and patterns

**Output:**
```json
{
  "tree": {
    "root": "Your Health Journey",
    "children": [
      {
        "category": "Training",
        "insights": [
          {
            "date": "2025-11-01",
            "summary": "ACWR elevated, recommend rest",
            "confidence": 0.95,
            "outcome": "followed"
          }
        ]
      },
      {
        "category": "Recovery",
        "insights": [...]
      }
    ]
  },
  "stats": {
    "total_insights": 47,
    "followed": 39,
    "adherence": 83
  }
}
```

**Use Cases:**
- Visual insight timeline on InsightsTree page
- Track coaching effectiveness
- Identify user engagement patterns

---

### yves-memory-update

**Purpose:** Update long-term memory when user preferences change

**Authentication:** Required

**Input:**
```json
{
  "user_id": "user-uuid",
  "memory_key": "sleep_goal_hours",
  "memory_value": "8"
}
```

**Process:**
1. Validate memory_key (predefined set)
2. Parse and validate memory_value
3. Upsert to `yves_memory_bank` table
4. Return updated memory

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

**Output:**
```json
{
  "success": true,
  "memory_key": "sleep_goal_hours",
  "memory_value": "8",
  "updated_at": "2025-11-02T15:30:00Z"
}
```

**Tables Modified:**
- `yves_memory_bank` (upsert by user_id, memory_key)

**Triggered By:**
- ProfileSetup page when sections saved
- Settings page when preferences updated

---

### generate-yves-recommendations

**Purpose:** Proactive AI recommendations without user query

**Trigger:**
- Scheduled (daily, 6 AM)
- After deviation detection finds high-risk zones

**Input:**
```json
{
  "user_id": "user-uuid"
}
```

**Process:**
1. Load context (similar to yves-chat)
2. Identify priority areas:
   - RED risk zones
   - Recent trends (improving/declining)
   - Upcoming goals/races
3. Generate 3-5 actionable recommendations
4. Store in `yves_recommendations` table

**Output:**
```json
{
  "recommendations": [
    {
      "priority": "high",
      "category": "recovery",
      "title": "ACWR in Red Zone",
      "description": "Your acute:chronic workload ratio is 1.4 (optimal: 0.8-1.3). Reduce training volume by 20% this week.",
      "actionable_steps": [
        "Replace tomorrow's interval session with easy 30min jog",
        "Add extra rest day this week"
      ]
    },
    {
      "priority": "medium",
      "category": "sleep",
      "title": "Sleep Quality Declining",
      "description": "Your sleep score has dropped 15% over the past week.",
      "actionable_steps": [
        "Review sleep environment (temperature, light, noise)",
        "Consider earlier bedtime tonight"
      ]
    }
  ],
  "generated_at": "2025-11-02T06:00:00Z"
}
```

**Tables Modified:**
- `yves_recommendations` (insert)

**Tables Queried:**
- `adaptive_recommendations`
- `wearable_sessions`
- `user_health_profiles`

**Display:**
- Dashboard → YvesRecommendationsCard component
- Push notification (if enabled)

---

## Authentication Functions

### oura-auth-initiate

**Purpose:** Start Oura OAuth flow

**Input:**
```json
{
  "user_id": "user-uuid"
}
```

**Process:**
1. Generate OAuth state token (CSRF protection)
2. Store state in session
3. Build Oura authorization URL
4. Return redirect URL

**Output:**
```json
{
  "auth_url": "https://cloud.ouraring.com/oauth/authorize?client_id=...&state=...",
  "state": "random-token"
}
```

**Frontend Flow:**
```typescript
const { data } = await supabase.functions.invoke('oura-auth-initiate', {
  body: { user_id }
});
window.location.href = data.auth_url;
```

---

### oura-auth

**Purpose:** Complete Oura OAuth flow (callback handler)

**Trigger:** Redirect from Oura after user authorizes

**Input (Query Params):**
```
?code=auth-code&state=csrf-token
```

**Process:**
1. Verify state token (CSRF check)
2. Exchange authorization code for tokens
3. Store in `oura_tokens` table:
   - access_token
   - refresh_token
   - expires_at
4. Redirect to success page

**Output:**
```json
{
  "success": true,
  "expires_at": "2025-11-02T16:30:00Z"
}
```

**Tables Modified:**
- `oura_tokens` (upsert by user_id)

**Error Handling:**
- Invalid state → redirect to error page
- Token exchange failure → log error, show user message
- Duplicate connection → update existing tokens

---

## Document Processing Functions

### analyze-document

**Purpose:** Extract structured health data from uploaded documents

**Authentication:** Required

**Input:**
```json
{
  "document_id": "doc-uuid",
  "document_type": "medical_record"  // or "nutrition_plan", "training_plan"
}
```

**Process:**
1. Fetch document from `user_documents` table
2. Extract text from PDF/image (OCR if needed)
3. Send to OpenAI with specialized prompt:
   - Medical: Extract conditions, medications, allergies, lab results
   - Nutrition: Extract macros, meal plan, supplements
   - Training: Extract program, phases, weekly schedule
4. Parse AI response into structured format
5. Store in `document_insights` table
6. Trigger `build-health-profile` if medical/nutrition document

**AI Prompt Structure:**
```
TASK: Extract structured health data from this document

DOCUMENT TYPE: Medical Record

REQUIRED FIELDS:
- Conditions: List all diagnosed conditions
- Medications: Name, dosage, frequency
- Allergies: Food, drug, environmental
- Lab Results: Recent bloodwork with values
- Contraindications: Training limitations

DOCUMENT TEXT:
[extracted text]

RESPONSE FORMAT: JSON
```

**Output:**
```json
{
  "success": true,
  "insights": {
    "insight_type": "medical",
    "insight_data": {
      "conditions": ["Asthma", "Iron deficiency"],
      "medications": [
        {"name": "Albuterol", "dosage": "90mcg", "frequency": "as needed"}
      ],
      "allergies": ["Peanuts"],
      "lab_results": {
        "hemoglobin": {"value": 13.2, "unit": "g/dL", "date": "2025-10-15"},
        "ferritin": {"value": 22, "unit": "ng/mL", "date": "2025-10-15"}
      },
      "contraindications": ["Avoid high-intensity in cold weather"]
    },
    "confidence": 0.88
  }
}
```

**Tables Modified:**
- `document_insights` (insert)
- `document_processing_log` (insert for audit)

**Tables Queried:**
- `user_documents`

**Performance:**
- Text extraction: ~1-3 seconds
- AI analysis: ~3-8 seconds
- Total: ~5-12 seconds

**Error Handling:**
- Unreadable documents → return error with retry suggestion
- Low confidence results → flag for manual review
- AI provider failures → queue for retry

---

### build-health-profile

**Purpose:** Synthesize all health data into comprehensive profile

**Authentication:** Required

**Input:**
```json
{
  "userId": "user-uuid"
}
```

**Process:**
1. Fetch all insights from `document_insights`
2. Group by type (nutrition, medical, training)
3. Extract latest insight per type
4. Send to AI for synthesis with prompt:
   - Summarize nutrition needs
   - Key medical considerations
   - Training program & goals
   - Connections between areas
   - Potential conflicts/concerns
5. Structure profile data:
   - `nutrition_summary`
   - `medical_summary`
   - `training_summary`
6. Increment version number
7. Store in `user_health_profiles` table

**Output:**
```json
{
  "success": true,
  "profile": {
    "user_id": "user-uuid",
    "version": 3,
    "profile_data": {
      "nutrition_summary": {
        "daily_calories": 2800,
        "macros": {"carbs": 55, "protein": 25, "fat": 20},
        "supplements": ["Iron", "Vitamin D"]
      },
      "medical_summary": {
        "active_conditions": ["Asthma"],
        "medications": ["Albuterol"],
        "allergies": ["Peanuts"],
        "contraindications": ["Avoid high-intensity in cold"]
      },
      "training_summary": {
        "program_name": "Marathon Base Building",
        "current_phase": "Base",
        "weekly_volume_km": 60,
        "goal_race_date": "2026-04-15"
      }
    },
    "ai_synthesis": "This athlete has asthma which requires careful monitoring during high-intensity efforts, especially in cold weather. Iron supplementation is critical given recent lab results showing borderline deficiency. Current marathon training is progressing well in base phase, but nutritional needs should be monitored closely as volume increases.",
    "generated_at": "2025-11-02T14:00:00Z"
  }
}
```

**Tables Modified:**
- `user_health_profiles` (insert with incremented version)

**Tables Queried:**
- `document_insights`

**Triggered By:**
- Document upload + analysis completion
- Manual profile refresh request
- Profile section updates

---

## Notification Functions

### send-sms-alert

**Purpose:** Send SMS alerts for high-risk health conditions

**Trigger:** Called by `calculate-deviation` when RED zones detected

**Input:**
```json
{
  "user_id": "user-uuid",
  "alert_type": "high_acwr",
  "message": "ALERT: Your ACWR is in the red zone (1.4). Consider rest or easy training today."
}
```

**Process:**
1. Check user's SMS preferences (enabled/disabled)
2. Fetch phone number from settings
3. Rate limit check (max 3 SMS per day)
4. Send via Twilio API
5. Log to `notification_log` table

**Output:**
```json
{
  "success": true,
  "message_sid": "SM1234567890",
  "sent_at": "2025-11-02T10:15:00Z"
}
```

**Tables Modified:**
- `notification_log` (insert)

**Tables Queried:**
- User settings (via profile or settings table)

**Configuration:**
- Twilio credentials from environment variables
- User opt-in required
- Phone number validation

**Error Handling:**
- Invalid phone number → log error, notify user
- Twilio API failure → retry once, then log failure
- Rate limit exceeded → queue for later

---

### email-preferences

**Purpose:** Manage user email notification preferences

**Authentication:** Required

**Input:**
```json
{
  "user_id": "user-uuid",
  "preferences": {
    "weekly_summary": true,
    "risk_alerts": true,
    "ai_coach_recommendations": false,
    "daily_briefing": true
  }
}
```

**Process:**
1. Validate preferences object
2. Update user's email settings
3. Return updated preferences

**Output:**
```json
{
  "success": true,
  "preferences": {...},
  "updated_at": "2025-11-02T15:00:00Z"
}
```

**Tables Modified:**
- User settings table (email_preferences column)

---

### generate-daily-briefing

**Purpose:** Create morning summary of health metrics and recommendations

**Trigger:** Cron job (daily at 6 AM user's timezone)

**Input:** None (processes all users)

**Process:**
1. For each user:
   - Fetch yesterday's metrics
   - Fetch current risk zones
   - Fetch upcoming training (if from calendar)
   - Generate AI summary:
     - Sleep quality recap
     - Readiness assessment
     - Today's recommendations
     - Any alerts
2. Store in `daily_briefings` table
3. Send email if enabled
4. Display on Dashboard

**AI Prompt:**
```
Generate a morning briefing for the user:

YESTERDAY'S SUMMARY:
Sleep Score: 82/100 (8h 15min)
HRV: 48ms (slightly below baseline)
Readiness: 75/100

CURRENT STATUS:
ACWR: 1.15 (optimal zone)
Training Strain: 780 (moderate)

TODAY'S OUTLOOK:
Weather: 45°F, partly cloudy
Scheduled Training: Easy 6-mile run

Create a concise, motivating briefing (150 words max) with specific recommendations.
```

**Output (stored in table):**
```json
{
  "user_id": "user-uuid",
  "date": "2025-11-02",
  "briefing_text": "Good morning! You had a solid night with 8h 15min of sleep (82/100). Your HRV is slightly below baseline (48ms vs 51ms), indicating you need a bit more recovery.\n\nToday's readiness is 75/100 - perfect for your scheduled easy 6-mile run. Keep your heart rate comfortable (< 145 bpm) and focus on form.\n\nKey Metrics:\n✅ ACWR: 1.15 (optimal)\n✅ Training Strain: 780 (manageable)\n⚠️ HRV: Slightly low\n\nRecommendation: Stick to your easy run today. If you feel sluggish in the first 2 miles, cut it short. Tomorrow's recovery will be important before your weekend long run.",
  "metrics_snapshot": {...},
  "generated_at": "2025-11-02T06:00:00Z"
}
```

**Tables Modified:**
- `daily_briefings` (insert)

**Tables Queried:**
- `wearable_sessions`
- `adaptive_recommendations`
- `user_health_profiles`

**Display:**
- Dashboard → DailyBriefingCard component

---

## Utility Functions

### health-check

**Purpose:** System health monitoring

**Input:** None

**Process:**
1. Check database connectivity
2. Test AI provider availability
3. Verify critical tables exist
4. Check recent function execution logs

**Output:**
```json
{
  "status": "healthy",
  "checks": {
    "database": "ok",
    "ai_provider": "ok",
    "critical_tables": "ok",
    "recent_functions": {
      "fetch-oura-auto": "success_1m_ago",
      "calculate-baseline": "success_5m_ago"
    }
  },
  "timestamp": "2025-11-02T10:30:00Z"
}
```

**Use Cases:**
- Uptime monitoring
- CI/CD health checks
- Debugging deployment issues

---

### test-twilio-env

**Purpose:** Test Twilio SMS configuration

**Input:**
```json
{
  "test_phone_number": "+1234567890"
}
```

**Process:**
1. Load Twilio credentials from environment
2. Send test SMS
3. Return result

**Output:**
```json
{
  "success": true,
  "message": "Test SMS sent successfully",
  "sid": "SM1234567890"
}
```

**Use Cases:**
- Verify Twilio setup during deployment
- Debug SMS issues

---

### lovable-ai-credits

**Purpose:** Track AI usage and credits (platform-specific)

**Authentication:** Required

**Input:** None

**Output:**
```json
{
  "credits_remaining": 1000,
  "credits_used_this_month": 250,
  "last_reset": "2025-11-01T00:00:00Z"
}
```

---

## Deployment & Testing

### Deploying Edge Functions

**Via Supabase CLI:**
```bash
supabase functions deploy function-name
```

**Via Supabase Dashboard:**
1. Navigate to Edge Functions
2. Click "Deploy New Function"
3. Select file or paste code
4. Configure environment variables
5. Deploy

### Environment Variables

**Required for all functions:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**AI Functions:**
- `AI_PROVIDER` (openai, anthropic, google)
- `OPENAI_API_KEY`

**Wearable Functions:**
- `OURA_CLIENT_ID`
- `OURA_CLIENT_SECRET`

**Notification Functions:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Testing Functions Locally

```bash
# Serve function locally
supabase functions serve function-name

# Invoke with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/function-name' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"key":"value"}'
```

### Common Error Patterns

**Timeout Errors:**
- Optimize database queries (add indexes)
- Batch operations where possible
- Consider pagination for large datasets

**Authentication Errors:**
- Verify JWT token format
- Check RLS policies
- Ensure user_id matches token

**AI Provider Errors:**
- Check API key validity
- Monitor rate limits
- Implement retry logic

---

## Performance Best Practices

1. **Database Queries:**
   - Use `.select()` to fetch only needed columns
   - Add `.limit()` for paginated data
   - Use `.maybeSingle()` instead of `.single()` for zero-or-one results

2. **API Calls:**
   - Batch requests where possible
   - Use Promise.all() for parallel calls
   - Implement exponential backoff for retries

3. **Error Handling:**
   - Always catch and log errors
   - Return user-friendly error messages
   - Never expose sensitive data in errors

4. **Logging:**
   - Log function start/end with timing
   - Log key decision points
   - Include user_id for debugging

---

## Security Considerations

1. **Authentication:**
   - Always verify JWT tokens for user-specific operations
   - Use service role key only for admin tasks
   - Never expose tokens to client

2. **Data Access:**
   - Respect RLS policies
   - Validate all user input
   - Sanitize database queries

3. **API Keys:**
   - Store in environment variables
   - Never log or expose keys
   - Rotate periodically

4. **Rate Limiting:**
   - Implement per-user rate limits
   - Log excessive usage
   - Gracefully handle limit violations

---

## Monitoring & Observability

**Logging Tables:**
- `function_execution_log` - All function invocations
- `oura_logs` - Wearable sync operations
- `notification_log` - SMS/email notifications
- `document_processing_log` - Document analysis

**Key Metrics to Monitor:**
- Function execution time (p50, p95, p99)
- Error rate by function
- User engagement (function calls per user)
- AI token usage

**Alerts to Configure:**
- Function failure rate > 5%
- Execution time > 30 seconds
- Database connection failures
- AI provider errors

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [DATA_FLOW.md](./DATA_FLOW.md) - Metric calculation journeys
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Table schemas

---

**Last Updated:** 2025-11-02
**Version:** 1.0.0
