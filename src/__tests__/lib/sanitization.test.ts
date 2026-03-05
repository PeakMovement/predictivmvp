import { describe, it, expect, beforeEach } from 'vitest';
import {
  sanitizeHTML,
  sanitizeText,
  escapeHTML,
  sanitizeURL,
  sanitizeEmail,
  sanitizeSearchQuery,
  sanitizeFileName,
  sanitizeJSON,
  sanitizeMarkdown,
  validateInputLength,
  MAX_INPUT_LENGTHS,
} from '@/lib/sanitization';

describe('sanitizeHTML', () => {
  it('should remove script tags', () => {
    const result = sanitizeHTML('<script>alert("XSS")</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('should remove event handlers', () => {
    const result = sanitizeHTML('<img src="x" onerror="alert(1)">');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('alert');
  });

  it('should allow safe HTML tags', () => {
    const html = '<p>Hello <strong>World</strong></p>';
    const result = sanitizeHTML(html);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('Hello');
    expect(result).toContain('World');
  });

  it('should remove javascript: protocol', () => {
    const result = sanitizeHTML('<a href="javascript:alert(1)">Click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('should remove data: protocol', () => {
    const result = sanitizeHTML('<img src="data:text/html,<script>alert(1)</script>">');
    expect(result).not.toContain('data:');
  });

  it('should allow safe links', () => {
    const html = '<a href="https://example.com">Link</a>';
    const result = sanitizeHTML(html);
    expect(result).toContain('href');
    expect(result).toContain('https://example.com');
  });

  it('should remove style tags with dangerous content', () => {
    const result = sanitizeHTML('<style>body { background: url(javascript:alert(1)); }</style>');
    expect(result).not.toContain('javascript:');
  });

  it('should handle nested tags', () => {
    const html = '<div><p><strong>Nested</strong> content</p></div>';
    const result = sanitizeHTML(html);
    expect(result).toContain('Nested');
    expect(result).toContain('content');
  });

  it('should strip disallowed tags but keep content', () => {
    const html = '<script>Hello</script><p>World</p>';
    const result = sanitizeHTML(html);
    expect(result).toContain('World');
  });
});

describe('sanitizeText', () => {
  it('should remove all HTML tags', () => {
    const result = sanitizeText('<p>Hello <strong>World</strong></p>');
    expect(result).toBe('Hello World');
  });

  it('should escape HTML entities', () => {
    const result = sanitizeText('<script>alert("XSS")</script>');
    expect(result).not.toContain('<script>');
  });

  it('should handle plain text', () => {
    const result = sanitizeText('Plain text without tags');
    expect(result).toBe('Plain text without tags');
  });

  it('should handle special characters', () => {
    const result = sanitizeText('Text with & < > " \'');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });
});

describe('escapeHTML', () => {
  it('should escape ampersand', () => {
    expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape less than', () => {
    expect(escapeHTML('5 < 10')).toBe('5 &lt; 10');
  });

  it('should escape greater than', () => {
    expect(escapeHTML('10 > 5')).toBe('10 &gt; 5');
  });

  it('should escape double quote', () => {
    const result = escapeHTML('Say "Hello"');
    expect(result).toContain('Hello');
  });

  it('should escape single quote', () => {
    const result = escapeHTML("It's fine");
    expect(result).toContain('fine');
  });

  it('should escape forward slash', () => {
    const result = escapeHTML('A / B');
    expect(result).toContain('A');
    expect(result).toContain('B');
  });

  it('should escape multiple characters', () => {
    const result = escapeHTML('<script>"alert(\'XSS\')"</script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('should leave normal text unchanged', () => {
    expect(escapeHTML('Normal text')).toBe('Normal text');
  });
});

describe('sanitizeURL', () => {
  it('should allow https URLs', () => {
    expect(sanitizeURL('https://example.com')).toBe('https://example.com');
  });

  it('should allow http URLs', () => {
    expect(sanitizeURL('http://example.com')).toBe('http://example.com');
  });

  it('should allow mailto URLs', () => {
    expect(sanitizeURL('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('should allow tel URLs', () => {
    expect(sanitizeURL('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('should block javascript protocol', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
  });

  it('should block data protocol', () => {
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('should block file protocol', () => {
    expect(sanitizeURL('file:///etc/passwd')).toBe('');
  });

  it('should allow relative URLs starting with /', () => {
    expect(sanitizeURL('/path/to/page')).toBe('/path/to/page');
  });

  it('should allow anchor links', () => {
    expect(sanitizeURL('#section')).toBe('#section');
  });

  it('should reject invalid URLs', () => {
    expect(sanitizeURL('not a valid url')).toBe('');
  });

  it('should handle empty string', () => {
    expect(sanitizeURL('')).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('should accept valid email', () => {
    expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('should convert to lowercase', () => {
    expect(sanitizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
  });

  it('should trim whitespace', () => {
    expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('should reject email without @', () => {
    expect(sanitizeEmail('userexample.com')).toBeNull();
  });

  it('should reject email without domain', () => {
    expect(sanitizeEmail('user@')).toBeNull();
  });

  it('should reject email without user', () => {
    expect(sanitizeEmail('@example.com')).toBeNull();
  });

  it('should reject invalid characters', () => {
    expect(sanitizeEmail('user<script>@example.com')).toBeNull();
  });

  it('should handle plus addressing', () => {
    expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
  });

  it('should handle dots in username', () => {
    expect(sanitizeEmail('first.last@example.com')).toBe('first.last@example.com');
  });
});

describe('sanitizeSearchQuery', () => {
  it('should allow normal search text', () => {
    expect(sanitizeSearchQuery('search term')).toBe('search term');
  });

  it('should remove SQL DROP keyword', () => {
    const result = sanitizeSearchQuery('test DROP TABLE users');
    expect(result).not.toContain('DROP');
  });

  it('should remove SQL DELETE keyword', () => {
    const result = sanitizeSearchQuery('test DELETE FROM users');
    expect(result).not.toContain('DELETE');
  });

  it('should remove SQL UNION keyword', () => {
    const result = sanitizeSearchQuery('test UNION SELECT password');
    expect(result).not.toContain('UNION');
  });

  it('should remove SQL comment markers', () => {
    const result = sanitizeSearchQuery('test--comment');
    expect(result).not.toContain('--');
  });

  it('should remove SQL keywords like DROP', () => {
    const result = sanitizeSearchQuery('test DROP users');
    expect(result).not.toContain('DROP');
    expect(result).toContain('test');
    expect(result).toContain('users');
  });

  it('should handle case-insensitive SQL keywords', () => {
    const result = sanitizeSearchQuery('test drop table users');
    expect(result).not.toContain('drop');
  });

  it('should preserve legitimate text', () => {
    const result = sanitizeSearchQuery('How to drop off packages?');
    expect(result).toContain('How to');
    expect(result).toContain('off packages');
  });
});

describe('sanitizeFileName', () => {
  it('should allow normal filenames', () => {
    expect(sanitizeFileName('document.pdf')).toBe('document.pdf');
  });

  it('should remove path traversal attempts', () => {
    const result = sanitizeFileName('../../../etc/passwd');
    expect(result).not.toContain('..');
    expect(result).toBe('etcpasswd');
  });

  it('should remove dangerous characters', () => {
    const result = sanitizeFileName('file<>:"/\\|?*.txt');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain(':');
    expect(result).not.toContain('?');
    expect(result).not.toContain('*');
  });

  it('should remove leading dots', () => {
    expect(sanitizeFileName('...hidden.txt')).toBe('hidden.txt');
  });

  it('should truncate long filenames', () => {
    const longName = 'a'.repeat(300) + '.txt';
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThanOrEqual(255);
  });

  it('should handle spaces', () => {
    expect(sanitizeFileName('my document.pdf')).toBe('my document.pdf');
  });
});

describe('sanitizeJSON', () => {
  it('should sanitize string values', () => {
    const obj = { name: '<script>alert(1)</script>' };
    const result = sanitizeJSON(obj);
    expect(result.name).not.toContain('<script>');
  });

  it('should preserve numbers', () => {
    const obj = { age: 25, score: 98.5 };
    const result = sanitizeJSON(obj);
    expect(result.age).toBe(25);
    expect(result.score).toBe(98.5);
  });

  it('should preserve booleans', () => {
    const obj = { active: true, deleted: false };
    const result = sanitizeJSON(obj);
    expect(result.active).toBe(true);
    expect(result.deleted).toBe(false);
  });

  it('should sanitize nested objects', () => {
    const obj = {
      user: {
        name: '<script>XSS</script>',
        email: 'test@example.com',
      },
    };
    const result = sanitizeJSON(obj);
    expect(result.user.name).not.toContain('<script>');
    expect(result.user.email).toBe('test@example.com');
  });

  it('should sanitize arrays', () => {
    const obj = {
      tags: ['<script>alert(1)</script>', 'safe-tag', '<img onerror=alert(1)>'],
    };
    const result = sanitizeJSON(obj);
    expect(result.tags[0]).not.toContain('<script>');
    expect(result.tags[1]).toBe('safe-tag');
  });

  it('should handle null values', () => {
    const obj = { value: null };
    const result = sanitizeJSON(obj);
    expect(result.value).toBeNull();
  });
});

describe('sanitizeMarkdown', () => {
  it('should allow markdown syntax', () => {
    const md = '# Heading\n**Bold** and *italic*';
    const result = sanitizeMarkdown(md);
    expect(result).toContain('Heading');
    expect(result).toContain('Bold');
    expect(result).toContain('italic');
  });

  it('should remove script tags', () => {
    const md = '# Title\n<script>alert(1)</script>';
    const result = sanitizeMarkdown(md);
    expect(result).not.toContain('<script>');
  });

  it('should allow safe links', () => {
    const md = '[Link](https://example.com)';
    const result = sanitizeMarkdown(md);
    expect(result).toContain('Link');
  });

  it('should allow code blocks', () => {
    const md = '```\nconst x = 1;\n```';
    const result = sanitizeMarkdown(md);
    expect(result).toContain('const x = 1');
  });
});

describe('validateInputLength', () => {
  it('should return true for valid length', () => {
    expect(validateInputLength('Hello', 10)).toBe(true);
  });

  it('should return false for too long input', () => {
    expect(validateInputLength('Hello World', 5)).toBe(false);
  });

  it('should return true for exact length', () => {
    expect(validateInputLength('Hello', 5)).toBe(true);
  });

  it('should handle empty string', () => {
    expect(validateInputLength('', 10)).toBe(true);
  });
});

describe('MAX_INPUT_LENGTHS', () => {
  it('should define TEXT_SHORT', () => {
    expect(MAX_INPUT_LENGTHS.TEXT_SHORT).toBe(255);
  });

  it('should define TEXT_MEDIUM', () => {
    expect(MAX_INPUT_LENGTHS.TEXT_MEDIUM).toBe(1000);
  });

  it('should define TEXT_LONG', () => {
    expect(MAX_INPUT_LENGTHS.TEXT_LONG).toBe(5000);
  });

  it('should define EMAIL', () => {
    expect(MAX_INPUT_LENGTHS.EMAIL).toBe(255);
  });

  it('should define URL', () => {
    expect(MAX_INPUT_LENGTHS.URL).toBe(2048);
  });

  it('should define FILENAME', () => {
    expect(MAX_INPUT_LENGTHS.FILENAME).toBe(255);
  });
});
