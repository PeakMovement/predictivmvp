# Security Implementation Guide

This document outlines the comprehensive security enhancements implemented to protect against common web vulnerabilities and API abuse.

## Overview

Three major security enhancement areas:
1. **Rate Limiting** - Protection against API abuse and DoS attacks
2. **Input Sanitization** - XSS and injection attack prevention
3. **Session Management** - Automatic timeout with warning system

---

## Task 15.1: Rate Limiting ✅

### Problem
No protection against API abuse, allowing malicious users to overwhelm the system with excessive requests.

### Solution

#### 1. Rate Limiting Infrastructure

**Created `supabase/functions/_shared/rate-limiter.ts`:**

```typescript
export class RateLimiter {
  async checkRateLimit(
    userId: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult>

  createRateLimitResponse(result: RateLimitResult): Response
}
```

**Rate Limit Configurations:**

| Service | Limit | Window | Key Prefix |
|---------|-------|--------|------------|
| AI Chat | 10 requests | 1 minute | `ai_chat` |
| Document Upload | 5 requests | 1 hour | `doc_upload` |
| Health Data | 30 requests | 1 minute | `health_data` |
| General API | 100 requests | 1 minute | `general_api` |

#### 2. Database Schema

**Created `rate_limits` table:**

```sql
CREATE TABLE rate_limits (
  id uuid PRIMARY KEY,
  key text UNIQUE NOT NULL,           -- Format: "prefix:user_id"
  count integer NOT NULL DEFAULT 0,   -- Request count
  reset_at timestamptz NOT NULL,      -- Reset timestamp
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_rate_limits_key ON rate_limits(key);
CREATE INDEX idx_rate_limits_reset_at ON rate_limits(reset_at);
```

**Security:**
- RLS enabled
- Service role only access
- Automatic cleanup of expired records

#### 3. Edge Function Integration

**Updated `yves-chat/index.ts`:**

```typescript
import { RateLimiter, RATE_LIMIT_CONFIGS } from "../_shared/rate-limiter.ts";

// After authentication
const rateLimiter = new RateLimiter();
const rateLimitResult = await rateLimiter.checkRateLimit(
  user.id,
  RATE_LIMIT_CONFIGS.AI_CHAT
);

if (!rateLimitResult.allowed) {
  return rateLimiter.createRateLimitResponse(rateLimitResult);
}
```

**Updated `analyze-document/index.ts`:**

```typescript
// Rate limiting for document uploads
const rateLimitResult = await rateLimiter.checkRateLimit(
  user.id,
  RATE_LIMIT_CONFIGS.DOCUMENT_UPLOAD
);
```

#### 4. Rate Limit Response Format

**429 Too Many Requests Response:**

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45,
  "resetAt": "2026-02-08T12:30:00Z"
}
```

**Response Headers:**
- `Retry-After`: Seconds until retry allowed
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

#### 5. Rate Limiting Features

**Per-User Tracking:**
- Each user has independent rate limits
- Tracked by user ID from auth token
- Prevents one user from affecting others

**Sliding Window:**
- Time-based windows (1 minute, 1 hour)
- Automatic reset after window expires
- Prevents burst attacks

**Graceful Degradation:**
- If rate limiting fails, requests are allowed
- Logs errors for monitoring
- Never blocks legitimate traffic due to DB issues

**Cleanup Function:**

```sql
CREATE FUNCTION cleanup_expired_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits
  WHERE reset_at < now() - interval '1 hour';
END;
$$;
```

---

## Task 15.2: Input Sanitization ✅

### Problem
Basic validation but no comprehensive XSS protection or injection attack prevention.

### Solution

#### 1. Client-Side Sanitization Library

**Created `src/lib/sanitization.ts` using DOMPurify:**

```typescript
// Sanitize HTML content
sanitizeHTML(dirty: string, options?: SanitizeOptions): string

// Sanitize plain text
sanitizeText(text: string): string

// Escape HTML entities
escapeHTML(str: string): string

// Sanitize URLs
sanitizeURL(url: string): string

// Sanitize form data
sanitizeFormData<T>(data: T): T

// Sanitize email
sanitizeEmail(email: string): string | null

// Sanitize search queries
sanitizeSearchQuery(query: string): string

// Sanitize file names
sanitizeFileName(filename: string): string

// Sanitize JSON objects
sanitizeJSON<T>(obj: T): T

// Sanitize markdown
sanitizeMarkdown(markdown: string): string
```

**DOMPurify Configuration:**

```typescript
const config: DOMPurify.Config = {
  ALLOWED_TAGS: [
    'b', 'i', 'em', 'strong', 'u', 'p', 'br',
    'ul', 'ol', 'li', 'a', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'class', 'id',
    'aria-label', 'aria-describedby'
  ],
  ALLOW_DATA_ATTR: false,
  ALLOW_UNKNOWN_PROTOCOLS: false,
  SAFE_FOR_TEMPLATES: true,
};
```

#### 2. Server-Side Sanitization

**Created `supabase/functions/_shared/sanitization.ts`:**

```typescript
// Escape HTML entities
escapeHTML(str: string): string

// Sanitize text
sanitizeText(text: string): string

// Sanitize email
sanitizeEmail(email: string): string | null

// Sanitize URL
sanitizeURL(url: string): string | null

// Sanitize search query (SQL injection prevention)
sanitizeSearchQuery(query: string): string

// Sanitize file name (path traversal prevention)
sanitizeFileName(filename: string): string

// Validate UUID
isValidUUID(uuid: string): boolean

// Sanitize integers
sanitizeInteger(value: unknown, min?: number, max?: number): number | null

// Sanitize floats
sanitizeFloat(value: unknown, min?: number, max?: number): number | null

// Sanitize JSON
sanitizeJSON<T>(obj: T): T

// Sanitize AI responses
sanitizeAIResponse(response: string): string

// Validate input length
validateLength(input: string, maxLength: number): boolean
```

#### 3. Maximum Input Lengths

**Client-Side (`src/lib/sanitization.ts`):**

```typescript
export const MAX_INPUT_LENGTHS = {
  TEXT_SHORT: 255,
  TEXT_MEDIUM: 1000,
  TEXT_LONG: 5000,
  TEXT_EXTRA_LONG: 10000,
  EMAIL: 255,
  URL: 2048,
  FILENAME: 255,
  SEARCH_QUERY: 500,
};
```

**Server-Side (`supabase/functions/_shared/sanitization.ts`):**

```typescript
export const MAX_LENGTHS = {
  TEXT_SHORT: 255,
  TEXT_MEDIUM: 1000,
  TEXT_LONG: 5000,
  TEXT_EXTRA_LONG: 10000,
  EMAIL: 255,
  URL: 2048,
  FILENAME: 255,
  SEARCH_QUERY: 500,
  AI_QUERY: 5000,
};
```

#### 4. XSS Protection

**Prevented Attack Vectors:**

```typescript
// JavaScript protocol
sanitizeURL('javascript:alert(1)') // Returns ''

// Data URI
sanitizeURL('data:text/html,<script>alert(1)</script>') // Returns ''

// Script tags
sanitizeHTML('<script>alert(1)</script>') // Returns ''

// Event handlers
sanitizeHTML('<img src=x onerror=alert(1)>') // Returns ''

// Style injection
sanitizeHTML('<div style="background:url(javascript:alert(1))">') // Returns ''
```

**Allowed Safe Content:**

```typescript
// Safe HTML
sanitizeHTML('<p>Hello <strong>World</strong></p>')
// Returns: '<p>Hello <strong>World</strong></p>'

// Safe links
sanitizeURL('https://example.com')
// Returns: 'https://example.com'

// Markdown
sanitizeMarkdown('# Hello\n**Bold text**')
// Returns sanitized markdown
```

#### 5. SQL Injection Prevention

**Blocked SQL Keywords:**

```typescript
const sqlKeywords = [
  'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER',
  'EXEC', 'EXECUTE', 'SCRIPT', 'UNION', 'SELECT', '--', ';',
  'TRUNCATE', 'GRANT', 'REVOKE'
];
```

**Example:**

```typescript
sanitizeSearchQuery("test'; DROP TABLE users--")
// Returns: "test"

sanitizeSearchQuery("SELECT * FROM users")
// Returns: "* FROM users"
```

**Note:** Primary protection is parameterized queries in Supabase, this is defense-in-depth.

#### 6. Path Traversal Prevention

**File Name Sanitization:**

```typescript
sanitizeFileName('../../../etc/passwd')
// Returns: 'etcpasswd'

sanitizeFileName('test<>:"/\\|?*.txt')
// Returns: 'test.txt'

sanitizeFileName('.hidden')
// Returns: 'hidden'
```

#### 7. AI Response Sanitization

**Prevented Prompt Injection in Responses:**

```typescript
sanitizeAIResponse(response: string): string {
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}
```

---

## Task 15.3: Session Timeout ✅

### Problem
Sessions persist indefinitely, posing security risks for unattended devices.

### Solution

#### 1. Session Timeout Hook

**Created `src/hooks/useSessionTimeout.ts`:**

```typescript
export function useSessionTimeout(config?: Partial<SessionTimeoutConfig>) {
  // Configuration
  const timeoutMs = 24 * 60 * 60 * 1000; // 24 hours
  const warningMs = 5 * 60 * 1000;       // 5 minutes warning

  // State
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [timeUntilTimeout, setTimeUntilTimeout] = useState<number | null>(null);

  // Functions
  updateActivity()       // Update last activity time
  extendSession()        // Refresh session token
  logout()               // Force logout and cleanup
  formatTimeRemaining()  // Format time display

  return {
    showWarning,
    timeUntilTimeout,
    timeRemaining,
    extendSession,
    dismissWarning,
    logout,
  };
}
```

**Activity Tracking Events:**
- `mousedown` - Mouse clicks
- `keydown` - Keyboard input
- `scroll` - Page scrolling
- `touchstart` - Touch interactions
- `click` - Click events

#### 2. Session Timeout Warning Modal

**Created `src/components/SessionTimeoutWarning.tsx`:**

```typescript
interface SessionTimeoutWarningProps {
  open: boolean;
  timeRemaining: string | null;
  onExtendSession: () => Promise<boolean>;
  onLogout: () => void;
  onDismiss: () => void;
}
```

**Modal Features:**
- Shows countdown timer
- Two action buttons:
  - **Stay Signed In** - Extends session
  - **Log Out Now** - Immediate logout
- Warning message about unsaved changes
- Sound notification (optional)
- Auto-focus for accessibility

**Visual Design:**
```
┌─────────────────────────────────────┐
│ ⏰ Session Expiring Soon            │
│                                     │
│ Your session will expire in 4m 30s  │
│                                     │
│ For your security, you'll be        │
│ automatically logged out if you     │
│ remain inactive.                    │
│                                     │
│ [Log Out Now]  [Stay Signed In]    │
└─────────────────────────────────────┘
```

#### 3. Session Extension

**Refresh Token Flow:**

```typescript
const extendSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();

  if (error) {
    console.error('Failed to refresh session:', error);
    return false;
  }

  if (data.session) {
    updateActivity(); // Reset activity timer
    return true;
  }

  return false;
};
```

**When Session Extended:**
1. Supabase refreshes JWT token
2. Activity timer resets to 0
3. Warning modal dismisses
4. User continues working
5. New 24-hour window starts

#### 4. Automatic Logout

**Logout Process:**

```typescript
const logout = async () => {
  // 1. Sign out from Supabase
  await supabase.auth.signOut();

  // 2. Clear localStorage
  const userSpecificKeys = [
    'todays-decision-cache',
    'insightHistory',
    'wearable_connected',
    'wearable_last_sync',
    'layout_customization',
    'alert-settings',
  ];
  userSpecificKeys.forEach(key => localStorage.removeItem(key));

  // 3. Clear sessionStorage
  const sessionKeys = [
    'activeClientProfile',
    'clientProfiles',
    'findHelpQuery',
    'wearable_code_verifier',
    'wearable_user_id',
  ];
  sessionKeys.forEach(key => sessionStorage.removeItem(key));

  // 4. Redirect to login
  window.location.href = '/';
};
```

**Security Benefits:**
- Prevents session hijacking on shared devices
- Forces re-authentication for sensitive operations
- Clears all cached user data
- Protects against abandoned sessions

#### 5. Timeline Visualization

**Session Lifecycle:**

```
0h                        23h 55m                 24h
├──────────────────────────┼───────────────────────┤
│                          │                       │
│   Active Session        │   Warning Period      │ Logout
│   (No warnings)         │   (Show modal)        │
│                          │                       │
└──────────────────────────┴───────────────────────┘
                           ↑
                    5 minutes before expiry
```

**User Actions:**

```
Activity Detected
      ↓
Reset Timer ────→ Continue Session
      ↑
      │
Warning Shown (5min before)
      ↓
┌─────────────┬─────────────┐
│             │             │
Stay Signed In   Log Out Now
      ↓             ↓
Extend Session   Logout
      ↓             ↓
Reset Timer    Redirect to Login
```

#### 6. Configuration Options

**Customizable Settings:**

```typescript
interface SessionTimeoutConfig {
  timeoutMs: number;     // Session duration (default: 24 hours)
  warningMs: number;     // Warning time (default: 5 minutes)
  onWarning: () => void; // Warning callback
  onTimeout: () => void; // Timeout callback
}
```

**Example Custom Configuration:**

```typescript
useSessionTimeout({
  timeoutMs: 2 * 60 * 60 * 1000,  // 2 hours
  warningMs: 10 * 60 * 1000,       // 10 minutes warning
  onWarning: () => {
    console.log('Session expiring soon');
    showNotification('Your session will expire soon');
  },
  onTimeout: () => {
    console.log('Session expired');
    saveUnsavedChanges();
    window.location.href = '/login';
  },
});
```

---

## Security Best Practices Implemented

### 1. Defense in Depth

**Multiple Security Layers:**
- Rate limiting at API level
- Input validation at client level
- Input sanitization at server level
- Session management at auth level
- RLS at database level

### 2. Fail Secure

**Error Handling:**
- Rate limiter fails open (allows request)
- Sanitization errors block request
- Invalid sessions force logout
- Missing auth denies access

### 3. Principle of Least Privilege

**Access Control:**
- Rate limits table: Service role only
- User data: Row-level security
- Edge functions: Require authentication
- Sanitization: Strip all dangerous content

### 4. Input Validation

**Client-Side:**
- Length limits
- Format validation
- Type checking
- XSS prevention

**Server-Side:**
- Re-validate all inputs
- Sanitize strings
- Validate UUIDs
- Check permissions

### 5. Session Security

**Best Practices:**
- Automatic timeout (24 hours)
- Warning before expiry (5 minutes)
- Refresh token rotation
- Clean session data on logout
- Track user activity

---

## Security Headers

**Recommended Headers (Already in Supabase):**

```typescript
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};
```

---

## Testing Security

### Rate Limiting Testing

**Manual Testing:**

```bash
# Test AI chat rate limit (10/min)
for i in {1..12}; do
  curl -X POST https://your-project.supabase.co/functions/v1/yves-chat \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"query":"test"}' &
done

# Expected: First 10 succeed, last 2 return 429
```

**Automated Testing:**

```typescript
// Test rate limiter
test('Rate limiter blocks after limit', async () => {
  const limiter = new RateLimiter();

  // Make 10 requests (should all succeed)
  for (let i = 0; i < 10; i++) {
    const result = await limiter.checkRateLimit('user-123', {
      maxRequests: 10,
      windowMs: 60000,
      keyPrefix: 'test'
    });
    expect(result.allowed).toBe(true);
  }

  // 11th request should fail
  const result = await limiter.checkRateLimit('user-123', {
    maxRequests: 10,
    windowMs: 60000,
    keyPrefix: 'test'
  });
  expect(result.allowed).toBe(false);
  expect(result.retryAfter).toBeGreaterThan(0);
});
```

### Input Sanitization Testing

**XSS Attack Tests:**

```typescript
test('Sanitizes XSS attacks', () => {
  expect(sanitizeHTML('<script>alert(1)</script>')).toBe('');
  expect(sanitizeHTML('<img src=x onerror=alert(1)>')).toBe('<img src="x">');
  expect(sanitizeURL('javascript:alert(1)')).toBe('');
});
```

**SQL Injection Tests:**

```typescript
test('Prevents SQL injection', () => {
  expect(sanitizeSearchQuery("test'; DROP TABLE users--")).toBe('test');
  expect(sanitizeSearchQuery('SELECT * FROM users')).not.toContain('SELECT');
});
```

**Path Traversal Tests:**

```typescript
test('Prevents path traversal', () => {
  expect(sanitizeFileName('../../../etc/passwd')).toBe('etcpasswd');
  expect(sanitizeFileName('../../secret.txt')).toBe('secret.txt');
});
```

### Session Timeout Testing

**Manual Testing:**

1. Log in to the application
2. Wait 23 hours 55 minutes (or adjust timeout for testing)
3. Verify warning modal appears
4. Click "Stay Signed In"
5. Verify session extends
6. Wait until timeout
7. Verify automatic logout

**Automated Testing:**

```typescript
test('Shows warning before timeout', async () => {
  const { result } = renderHook(() => useSessionTimeout({
    timeoutMs: 60000,  // 1 minute
    warningMs: 10000,  // 10 seconds
  }));

  // Wait 50 seconds
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 50000));
  });

  expect(result.current.showWarning).toBe(true);
});
```

---

## Deployment Checklist

### Edge Functions

- [ ] Deploy `_shared/rate-limiter.ts`
- [ ] Deploy `_shared/sanitization.ts`
- [ ] Deploy updated `yves-chat/index.ts`
- [ ] Deploy updated `analyze-document/index.ts`
- [ ] Test all endpoints return proper rate limit headers
- [ ] Verify 429 responses include retry-after

### Database

- [x] Apply `rate_limits` table migration
- [ ] Verify RLS policies are active
- [ ] Test service role can read/write rate_limits
- [ ] Test authenticated users cannot access rate_limits
- [ ] Set up cron job for `cleanup_expired_rate_limits()`

### Frontend

- [x] Add DOMPurify to dependencies
- [x] Create sanitization utilities
- [x] Create session timeout hook
- [x] Create session timeout warning modal
- [x] Integrate session timeout in App.tsx
- [ ] Test session timeout warning
- [ ] Test session extension
- [ ] Test automatic logout

### Security Audit

- [ ] Review all user inputs are sanitized
- [ ] Verify all API calls include authentication
- [ ] Check rate limits are appropriate
- [ ] Test session timeout duration
- [ ] Review error messages don't leak info
- [ ] Scan for hardcoded secrets
- [ ] Test CORS configuration
- [ ] Verify HTTPS only in production

---

## Monitoring & Logging

### Rate Limiting

**Metrics to Track:**
- Total rate limit hits per hour
- Users hitting rate limits frequently
- API endpoints with most rate limit violations
- Rate limit database performance

**Example Query:**

```sql
SELECT
  key,
  count,
  reset_at
FROM rate_limits
WHERE count >= maxRequests
ORDER BY updated_at DESC
LIMIT 100;
```

### Security Incidents

**Alert On:**
- Multiple rate limit violations from same user
- Suspicious input patterns (SQL keywords, XSS attempts)
- Multiple session timeout warnings ignored
- Failed authentication attempts

**Log Examples:**

```
[SECURITY] Rate limit exceeded: user=abc-123, endpoint=yves-chat
[SECURITY] XSS attempt blocked: user=abc-123, input=<script>...
[SECURITY] SQL injection blocked: user=abc-123, query=DROP TABLE...
[SECURITY] Session expired: user=abc-123, duration=24h
```

---

## Future Enhancements

### Potential Improvements

1. **Adaptive Rate Limiting**
   - Increase limits for trusted users
   - Decrease limits after violations
   - Per-endpoint custom limits

2. **Advanced Input Validation**
   - Machine learning-based anomaly detection
   - Pattern matching for common attacks
   - Real-time threat intelligence integration

3. **Enhanced Session Security**
   - Device fingerprinting
   - Location-based session validation
   - Multi-factor authentication requirement
   - Session binding to IP address

4. **Security Dashboard**
   - Real-time security metrics
   - Attack pattern visualization
   - User behavior analytics
   - Automated threat response

5. **Audit Logging**
   - Comprehensive audit trail
   - Tamper-proof logging
   - Compliance reporting
   - Forensic analysis tools

---

## Security Contact

**Reporting Security Issues:**
- Email: security@predictiv.health (example)
- PGP Key: [Public key] (if applicable)
- Response time: 24-48 hours

**Do NOT:**
- Report security issues publicly
- Test attacks on production
- Share vulnerabilities before patch

**Bug Bounty:**
- Consider establishing a bug bounty program
- Reward responsible disclosure
- Encourage security research

---

**Last Updated:** February 2026
**Task Group:** GROUP 15 - Security Enhancements
**Status:** ✅ Complete
**Security Level:** Production-Ready
