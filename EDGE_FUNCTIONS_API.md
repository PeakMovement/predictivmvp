# Edge Functions API Documentation

This document provides comprehensive API documentation for all Supabase Edge Functions in the Predictiv Health platform.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Functions by Category](#functions-by-category)
  - [AI & Intelligence](#ai--intelligence)
  - [Wearable Integration](#wearable-integration)
  - [Health Analysis](#health-analysis)
  - [User Management](#user-management)
  - [Notifications](#notifications)

---

## Overview

All edge functions are deployed at:
```
https://your-project.supabase.co/functions/v1/function-name
```

### Base URL
```
Production: https://your-project.supabase.co/functions/v1
Development: http://localhost:54321/functions/v1
```

### Content Type
All requests and responses use `application/json` unless otherwise specified.

### CORS
All functions support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-Client-Info, Apikey`

---

## Authentication

### Required Headers

**For all authenticated endpoints:**
```http
Authorization: Bearer {user_jwt_token}
apikey: {supabase_anon_key}
```

### Getting a User JWT

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

### Public Endpoints

Some endpoints are publicly accessible:
- `/health-check`
- `/oura-webhook` (requires webhook signature)
- `/calendly-webhook` (requires webhook signature)

---

## Rate Limiting

Rate limits are applied per user per function:

| Function Type | Rate Limit |
|---------------|------------|
| AI Functions | 10 requests/minute |
| Data Sync | 60 requests/minute |
| Analytics | 30 requests/minute |
| Webhooks | No limit (signature verified) |

### Rate Limit Headers

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1643723400
```

### Rate Limit Error

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error context"
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |
| 503 | Service Unavailable - External API failure |

---

## Functions by Category

## AI & Intelligence

### `yves-chat`

Chat with the Yves AI health assistant.

**Endpoint:** `POST /yves-chat`

**Authentication:** Required

**Request Body:**
```json
{
  "message": "How's my recovery today?",
  "thread_id": "optional-thread-id",
  "include_context": true
}
```

**Parameters:**
- `message` (string, required): User's question or message
- `thread_id` (string, optional): Previous conversation thread ID
- `include_context` (boolean, optional): Include health data context. Default: true

**Response:**
```json
{
  "response": "Based on your recent data, your recovery is excellent...",
  "thread_id": "thread_abc123",
  "context_used": {
    "sleep_score": 85,
    "hrv": 65,
    "readiness": 82
  },
  "suggestions": [
    "Consider a moderate intensity workout",
    "Aim for 7-8 hours of sleep tonight"
  ],
  "created_at": "2026-02-08T14:30:00Z"
}
```

**Error Codes:**
- `400`: Invalid message format
- `401`: Not authenticated
- `429`: Rate limit exceeded (10 req/min)
- `503`: OpenAI API unavailable

**Example:**
```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/yves-chat`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Should I train today?',
      include_context: true
    })
  }
);
```

---

### `generate-daily-briefing`

Generate the daily health briefing.

**Endpoint:** `POST /generate-daily-briefing`

**Authentication:** Required

**Request Body:**
```json
{
  "force_regenerate": false,
  "focus_mode": "recovery"
}
```

**Parameters:**
- `force_regenerate` (boolean, optional): Skip cache and generate new briefing
- `focus_mode` (string, optional): One of: recovery, performance, pain_management, balance, custom

**Response:**
```json
{
  "briefing": {
    "id": "brief_123",
    "content": "Your sleep quality was excellent last night...",
    "key_metrics": {
      "sleep_score": 85,
      "hrv": 65,
      "strain": 8.5,
      "recovery_score": 82
    },
    "health_trends": {
      "improving": ["sleep_quality", "hrv"],
      "declining": [],
      "stable": ["activity_level"]
    },
    "recommendations": [
      "Consider a moderate intensity workout today",
      "Stay hydrated throughout the day"
    ],
    "alerts": []
  },
  "cached": false,
  "generated_at": "2026-02-08T06:00:00Z"
}
```

**Error Codes:**
- `401`: Not authenticated
- `429`: Rate limit exceeded
- `500`: Failed to generate briefing

---

### `generate-yves-recommendations`

Generate personalized health recommendations.

**Endpoint:** `POST /generate-yves-recommendations`

**Authentication:** Required

**Request Body:**
```json
{
  "context": "training",
  "time_range_days": 7
}
```

**Parameters:**
- `context` (string, optional): Context for recommendations (training, recovery, sleep, nutrition)
- `time_range_days` (number, optional): Days of data to analyze. Default: 7

**Response:**
```json
{
  "recommendations": [
    {
      "category": "training",
      "priority": "high",
      "title": "Reduce training load this week",
      "description": "Your ACWR is above 1.5, indicating elevated injury risk...",
      "action_items": [
        "Reduce intensity by 20% this week",
        "Add an extra rest day",
        "Focus on recovery activities"
      ],
      "expected_impact": "Lower injury risk by 30%"
    }
  ],
  "generated_at": "2026-02-08T14:30:00Z"
}
```

---

## Wearable Integration

### `fetch-oura-data`

Fetch latest data from Oura Ring.

**Endpoint:** `POST /fetch-oura-data`

**Authentication:** Required

**Request Body:**
```json
{
  "data_types": ["sleep", "readiness", "activity"],
  "start_date": "2026-02-01",
  "end_date": "2026-02-08"
}
```

**Parameters:**
- `data_types` (array, optional): Types to fetch. Default: all types
- `start_date` (string, optional): ISO date. Default: yesterday
- `end_date` (string, optional): ISO date. Default: today

**Response:**
```json
{
  "success": true,
  "records_synced": {
    "sleep": 7,
    "readiness": 7,
    "activity": 7
  },
  "last_sync": "2026-02-08T14:30:00Z"
}
```

**Error Codes:**
- `401`: Not authenticated or Oura not connected
- `403`: Oura token expired - reauthorization required
- `503`: Oura API unavailable

---

### `oura-auth`

Complete Oura OAuth flow and store tokens.

**Endpoint:** `GET /oura-auth`

**Authentication:** Required (via state parameter)

**Query Parameters:**
- `code` (string, required): OAuth authorization code
- `state` (string, required): State parameter for CSRF protection

**Response:**
```json
{
  "success": true,
  "message": "Oura connected successfully",
  "expires_at": "2026-08-08T14:30:00Z"
}
```

**Error Codes:**
- `400`: Missing or invalid code/state
- `401`: Invalid state - possible CSRF attack
- `503`: Oura token exchange failed

---

### `fetch-polar-exercises`

Fetch exercise data from Polar.

**Endpoint:** `POST /fetch-polar-exercises`

**Authentication:** Required

**Request Body:**
```json
{
  "start_date": "2026-02-01",
  "end_date": "2026-02-08"
}
```

**Response:**
```json
{
  "success": true,
  "exercises": [
    {
      "id": "ex_123",
      "start_time": "2026-02-08T07:00:00Z",
      "duration_minutes": 45,
      "sport": "RUNNING",
      "distance_meters": 7500,
      "calories": 425,
      "avg_heart_rate": 145,
      "max_heart_rate": 168
    }
  ],
  "synced_count": 5
}
```

---

### `oura-webhook`

Webhook endpoint for Oura data updates.

**Endpoint:** `POST /oura-webhook`

**Authentication:** Webhook signature verification

**Headers:**
- `X-Oura-Signature`: HMAC signature for verification

**Request Body:**
```json
{
  "verification_token": "token",
  "user_id": "oura_user_123",
  "data_type": "sleep",
  "timestamp": "2026-02-08T06:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "processed": true
}
```

---

## Health Analysis

### `calculate-baseline`

Calculate user's baseline metrics.

**Endpoint:** `POST /calculate-baseline`

**Authentication:** Required

**Request Body:**
```json
{
  "metric": "hrv",
  "days": 30
}
```

**Parameters:**
- `metric` (string, required): Metric to calculate (hrv, rhr, sleep_score, etc.)
- `days` (number, optional): Days of data to use. Default: 30

**Response:**
```json
{
  "metric": "hrv",
  "baseline": 62.5,
  "std_deviation": 8.3,
  "confidence": 0.92,
  "data_points": 28,
  "calculated_at": "2026-02-08T14:30:00Z"
}
```

---

### `calculate-deviation`

Calculate how current metrics deviate from baseline.

**Endpoint:** `POST /calculate-deviation`

**Authentication:** Required

**Request Body:**
```json
{
  "metric": "hrv",
  "current_value": 75
}
```

**Response:**
```json
{
  "metric": "hrv",
  "current_value": 75,
  "baseline": 62.5,
  "deviation_percent": 20,
  "z_score": 1.5,
  "significance": "moderate",
  "interpretation": "Your HRV is significantly above baseline, indicating good recovery"
}
```

---

### `detect-health-anomalies`

Detect anomalies in health data.

**Endpoint:** `POST /detect-health-anomalies`

**Authentication:** Required

**Request Body:**
```json
{
  "days": 7,
  "sensitivity": "medium"
}
```

**Parameters:**
- `days` (number, optional): Days to analyze. Default: 7
- `sensitivity` (string, optional): low, medium, high. Default: medium

**Response:**
```json
{
  "anomalies": [
    {
      "date": "2026-02-07",
      "metric": "hrv",
      "value": 45,
      "baseline": 62.5,
      "z_score": -2.1,
      "severity": "high",
      "description": "HRV dropped significantly below baseline"
    }
  ],
  "risk_level": "moderate",
  "recommendations": [
    "Consider taking a rest day",
    "Focus on sleep quality tonight"
  ]
}
```

---

### `analyze-document`

Analyze uploaded medical document with AI.

**Endpoint:** `POST /analyze-document`

**Authentication:** Required

**Request Body:**
```json
{
  "document_id": "doc_123",
  "analysis_type": "summary"
}
```

**Parameters:**
- `document_id` (string, required): ID of uploaded document
- `analysis_type` (string, optional): summary, key_findings, recommendations

**Response:**
```json
{
  "document_id": "doc_123",
  "analysis": {
    "summary": "Blood test results show normal ranges for most markers...",
    "key_findings": [
      "Vitamin D: 45 ng/mL (optimal)",
      "Iron: 85 µg/dL (normal)",
      "Cholesterol: 180 mg/dL (good)"
    ],
    "recommendations": [
      "Continue current supplementation",
      "Retest in 6 months"
    ],
    "risk_factors": []
  },
  "analyzed_at": "2026-02-08T14:30:00Z"
}
```

---

## User Management

### `build-health-profile`

Build comprehensive health profile from all user data.

**Endpoint:** `POST /build-health-profile`

**Authentication:** Required

**Request Body:**
```json
{
  "include_sections": ["medical_history", "current_metrics", "trends"]
}
```

**Response:**
```json
{
  "profile": {
    "user_id": "user_123",
    "medical_history": {
      "conditions": ["asthma"],
      "medications": ["albuterol"],
      "allergies": []
    },
    "current_metrics": {
      "age": 32,
      "fitness_level": "intermediate",
      "avg_hrv": 65,
      "avg_rhr": 58
    },
    "trends": {
      "sleep_quality": "improving",
      "training_load": "stable",
      "recovery": "good"
    },
    "ai_synthesis": "Patient shows consistent improvement in cardiovascular fitness..."
  },
  "generated_at": "2026-02-08T14:30:00Z"
}
```

---

### `calculate-plan-adherence`

Calculate adherence to health/training plan.

**Endpoint:** `POST /calculate-plan-adherence`

**Authentication:** Required

**Request Body:**
```json
{
  "plan_id": "plan_123",
  "time_range_days": 30
}
```

**Response:**
```json
{
  "adherence_score": 85,
  "completed_actions": 24,
  "total_actions": 28,
  "missed_actions": 4,
  "trends": {
    "week_1": 90,
    "week_2": 85,
    "week_3": 80,
    "week_4": 85
  },
  "recommendations": [
    "You're doing great! Keep up the consistency",
    "Focus on completing evening stretching sessions"
  ]
}
```

---

## Notifications

### `send-risk-email`

Send risk alert email to user.

**Endpoint:** `POST /send-risk-email`

**Authentication:** Service Role (internal use only)

**Request Body:**
```json
{
  "user_id": "user_123",
  "risk_level": "high",
  "metrics": {
    "acwr": 1.8,
    "hrv_drop": 30
  },
  "recommendations": [
    "Take a rest day",
    "Consider scheduling recovery session"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "email_id": "email_123",
  "sent_at": "2026-02-08T14:30:00Z"
}
```

---

### `send-sms-alert`

Send SMS alert to user.

**Endpoint:** `POST /send-sms-alert`

**Authentication:** Service Role (internal use only)

**Request Body:**
```json
{
  "user_id": "user_123",
  "message": "Your HRV has dropped significantly. Consider taking a rest day.",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "message_id": "sms_123",
  "sent_at": "2026-02-08T14:30:00Z"
}
```

---

## System Functions

### `health-check`

Check system health status.

**Endpoint:** `GET /health-check`

**Authentication:** None (public)

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-08T14:30:00Z",
  "services": {
    "database": "healthy",
    "openai": "healthy",
    "oura_api": "healthy",
    "polar_api": "healthy"
  }
}
```

---

### `wearable-diagnostics`

Get diagnostic information about wearable integrations.

**Endpoint:** `GET /wearable-diagnostics`

**Authentication:** Required

**Response:**
```json
{
  "user_id": "user_123",
  "connections": {
    "oura": {
      "connected": true,
      "last_sync": "2026-02-08T06:00:00Z",
      "token_expires": "2026-08-08T00:00:00Z",
      "status": "healthy"
    },
    "polar": {
      "connected": false,
      "status": "not_connected"
    },
    "fitbit": {
      "connected": true,
      "last_sync": "2026-02-08T05:00:00Z",
      "token_expires": "2026-08-08T00:00:00Z",
      "status": "healthy"
    }
  },
  "recent_syncs": [
    {
      "source": "oura",
      "type": "sleep",
      "timestamp": "2026-02-08T06:00:00Z",
      "records": 1,
      "status": "success"
    }
  ]
}
```

---

## Webhook Signatures

### Verifying Oura Webhooks

```typescript
import crypto from 'crypto';

function verifyOuraSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(hmac)
  );
}
```

### Verifying Calendly Webhooks

```typescript
function verifyCalendlySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');

  return signature === hmac;
}
```

---

## Testing Edge Functions

### Local Testing

```bash
# Start functions locally
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/yves-chat \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```

### Unit Testing

```typescript
import { assertEquals } from 'https://deno.land/std/testing/asserts.ts';

Deno.test('function returns correct response', async () => {
  const response = await handler(mockRequest);
  const data = await response.json();

  assertEquals(response.status, 200);
  assertEquals(data.success, true);
});
```

---

## Best Practices

### Security

1. **Always validate input**: Use Zod or similar for request validation
2. **Sanitize user data**: Never trust user input
3. **Use RLS**: Rely on Row Level Security for data access
4. **Rotate secrets**: Regularly rotate API keys and secrets
5. **Verify webhooks**: Always verify webhook signatures

### Performance

1. **Cache when possible**: Use Supabase cache or external caching
2. **Batch operations**: Combine multiple DB queries
3. **Use indexes**: Ensure proper database indexing
4. **Limit data**: Only fetch required fields
5. **Set timeouts**: Configure appropriate timeouts

### Error Handling

1. **Use try-catch**: Wrap all async operations
2. **Log errors**: Log to Supabase logs for debugging
3. **Return consistent errors**: Use standard error format
4. **Don't expose internals**: Sanitize error messages
5. **Handle edge cases**: Test with malformed data

### Monitoring

1. **Track execution time**: Monitor function performance
2. **Log important events**: Log key operations
3. **Set up alerts**: Alert on errors or anomalies
4. **Monitor rate limits**: Track API usage
5. **Review logs regularly**: Check for patterns

---

## Changelog

### Version 1.0.0 (2026-02-08)
- Initial API documentation
- All core functions documented
- OpenAPI spec generated

---

## Support

For questions or issues:
- **Documentation**: Check relevant `.md` files in project root
- **Issues**: Create an issue on GitHub
- **Team Chat**: Post in development channel

---

**Last Updated**: February 2026
**API Version**: 1.0.0
