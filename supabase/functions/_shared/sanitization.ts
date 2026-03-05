/**
 * Server-side input sanitization utilities for edge functions
 * Prevents XSS, SQL injection, and other security vulnerabilities
 */

/**
 * Escape HTML entities in a string
 * @param str - String to escape
 * @returns Escaped string
 */
export const escapeHTML = (str: string): string => {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Sanitize text by removing HTML tags and escaping entities
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export const sanitizeText = (text: string): string => {
  return escapeHTML(text.replace(/<[^>]*>/g, ''));
};

/**
 * Validate and sanitize email address
 * @param email - Email to validate
 * @returns Sanitized email or null if invalid
 */
export const sanitizeEmail = (email: string): string | null => {
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  if (sanitized.length > 255) {
    return null;
  }

  return sanitized;
};

/**
 * Sanitize URL to prevent javascript: and data: protocols
 * @param url - URL to sanitize
 * @returns Sanitized URL or null if invalid
 */
export const sanitizeURL = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

    if (!allowedProtocols.includes(parsed.protocol)) {
      console.warn(`Blocked unsafe URL protocol: ${parsed.protocol}`);
      return null;
    }

    return url;
  } catch {
    if (url.startsWith('/') || url.startsWith('#')) {
      return url;
    }
    return null;
  }
};

/**
 * Sanitize search query to prevent SQL injection
 * @param query - Search query
 * @returns Sanitized query
 */
export const sanitizeSearchQuery = (query: string): string => {
  let sanitized = sanitizeText(query);

  const sqlKeywords = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER',
    'EXEC', 'EXECUTE', 'SCRIPT', 'UNION', 'SELECT', '--', ';',
    'TRUNCATE', 'GRANT', 'REVOKE'
  ];

  sqlKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  return sanitized.trim();
};

/**
 * Sanitize file name to prevent directory traversal
 * @param filename - File name to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFileName = (filename: string): string => {
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\.+/, '')
    .substring(0, 255);
};

/**
 * Validate UUID format
 * @param uuid - UUID string to validate
 * @returns True if valid UUID
 */
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate and sanitize integer input
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized integer or null if invalid
 */
export const sanitizeInteger = (
  value: unknown,
  min?: number,
  max?: number
): number | null => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    if (min !== undefined && value < min) return null;
    if (max !== undefined && value > max) return null;
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) return null;
    if (min !== undefined && parsed < min) return null;
    if (max !== undefined && parsed > max) return null;
    return parsed;
  }

  return null;
};

/**
 * Validate and sanitize float input
 * @param value - Value to validate
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized float or null if invalid
 */
export const sanitizeFloat = (
  value: unknown,
  min?: number,
  max?: number
): number | null => {
  if (typeof value === 'number' && !isNaN(value)) {
    if (min !== undefined && value < min) return null;
    if (max !== undefined && value > max) return null;
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (isNaN(parsed)) return null;
    if (min !== undefined && parsed < min) return null;
    if (max !== undefined && parsed > max) return null;
    return parsed;
  }

  return null;
};

/**
 * Sanitize JSON object recursively
 * @param obj - Object to sanitize
 * @returns Sanitized object
 */
export const sanitizeJSON = <T extends Record<string, any>>(obj: T): T => {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeText(key);

    if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? sanitizeJSON(item)
          : typeof item === 'string'
          ? sanitizeText(item)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[sanitizedKey] = sanitizeJSON(value);
    } else {
      sanitized[sanitizedKey] = value;
    }
  }

  return sanitized as T;
};

/**
 * Validate input length
 * @param input - Input string
 * @param maxLength - Maximum allowed length
 * @returns True if valid
 */
export const validateLength = (input: string, maxLength: number): boolean => {
  return input.length <= maxLength;
};

/**
 * Sanitize AI response to prevent prompt injection in responses
 * @param response - AI response text
 * @returns Sanitized response
 */
export const sanitizeAIResponse = (response: string): string => {
  let sanitized = response;

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
};

/**
 * Maximum input lengths
 */
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
} as const;

/**
 * Create validation error response
 * @param message - Error message
 * @param field - Field name that failed validation
 * @returns Response object
 */
export const createValidationError = (
  message: string,
  field?: string
): Response => {
  return new Response(
    JSON.stringify({
      error: 'Validation error',
      message,
      field,
    }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
