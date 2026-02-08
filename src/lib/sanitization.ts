import DOMPurify from 'dompurify';

/**
 * Security utilities for input sanitization and XSS protection
 */

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - Raw HTML string
 * @param options - DOMPurify configuration options
 * @returns Sanitized HTML string
 */
export const sanitizeHTML = (
  dirty: string,
  options?: {
    ALLOWED_TAGS?: string[];
    ALLOWED_ATTR?: string[];
    KEEP_CONTENT?: boolean;
  }
): string => {
  const config: DOMPurify.Config = {
    ALLOWED_TAGS: options?.ALLOWED_TAGS || [
      'b', 'i', 'em', 'strong', 'u', 'p', 'br',
      'ul', 'ol', 'li', 'a', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: options?.ALLOWED_ATTR || [
      'href', 'title', 'class', 'id', 'aria-label', 'aria-describedby'
    ],
    KEEP_CONTENT: options?.KEEP_CONTENT !== undefined ? options.KEEP_CONTENT : true,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SAFE_FOR_TEMPLATES: true,
  };

  return DOMPurify.sanitize(dirty, config);
};

/**
 * Sanitize plain text to prevent script injection
 * @param text - Raw text string
 * @returns Sanitized text with HTML entities escaped
 */
export const sanitizeText = (text: string): string => {
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
};

/**
 * Escape HTML entities in a string
 * @param str - String to escape
 * @returns Escaped string
 */
export const escapeHTML = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Sanitize URL to prevent javascript: and data: protocol attacks
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export const sanitizeURL = (url: string): string => {
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];

    if (!allowedProtocols.includes(parsed.protocol)) {
      console.warn(`Blocked unsafe URL protocol: ${parsed.protocol}`);
      return '';
    }

    return url;
  } catch {
    if (url.startsWith('/') || url.startsWith('#')) {
      return url;
    }
    console.warn('Invalid URL provided');
    return '';
  }
};

/**
 * Sanitize form input data
 * @param data - Object with form field values
 * @returns Sanitized object
 */
export const sanitizeFormData = <T extends Record<string, any>>(
  data: T
): T => {
  const sanitized: any = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeText(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeFormData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
};

/**
 * Validate and sanitize email address
 * @param email - Email address to validate
 * @returns Sanitized email or null if invalid
 */
export const sanitizeEmail = (email: string): string | null => {
  const sanitized = sanitizeText(email.trim().toLowerCase());
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
};

/**
 * Sanitize search query to prevent SQL injection attempts
 * @param query - Search query string
 * @returns Sanitized query
 */
export const sanitizeSearchQuery = (query: string): string => {
  const sanitized = sanitizeText(query);

  const sqlKeywords = [
    'DROP', 'DELETE', 'INSERT', 'UPDATE', 'CREATE', 'ALTER',
    'EXEC', 'EXECUTE', 'SCRIPT', 'UNION', 'SELECT', '--', ';'
  ];

  let result = sanitized;
  sqlKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    result = result.replace(regex, '');
  });

  return result.trim();
};

/**
 * Sanitize file name to prevent directory traversal attacks
 * @param filename - File name to sanitize
 * @returns Sanitized filename
 */
export const sanitizeFileName = (filename: string): string => {
  const sanitized = sanitizeText(filename);

  return sanitized
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\.\./g, '')
    .replace(/^\.+/, '')
    .substring(0, 255);
};

/**
 * Sanitize JSON data by removing potentially dangerous content
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
 * Validate input length to prevent DoS attacks
 * @param input - Input string to validate
 * @param maxLength - Maximum allowed length
 * @returns True if valid, false otherwise
 */
export const validateInputLength = (
  input: string,
  maxLength: number
): boolean => {
  return input.length <= maxLength;
};

/**
 * Sanitize markdown content (preserves markdown syntax but removes dangerous HTML)
 * @param markdown - Markdown content
 * @returns Sanitized markdown
 */
export const sanitizeMarkdown = (markdown: string): string => {
  return DOMPurify.sanitize(markdown, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'code', 'pre',
      'ul', 'ol', 'li', 'blockquote', 'a',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
    ],
    ALLOWED_ATTR: ['href', 'title'],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
  });
};

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
} as const;

/**
 * Rate limit error message
 */
export const RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.';

/**
 * Maximum input lengths for various fields
 */
export const MAX_INPUT_LENGTHS = {
  TEXT_SHORT: 255,
  TEXT_MEDIUM: 1000,
  TEXT_LONG: 5000,
  TEXT_EXTRA_LONG: 10000,
  EMAIL: 255,
  URL: 2048,
  FILENAME: 255,
  SEARCH_QUERY: 500,
} as const;
