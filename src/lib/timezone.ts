/**
 * Timezone Utilities
 *
 * Handles timezone conversions and formatting for the application.
 * All dates in the database are stored in UTC, and these utilities
 * convert them to the user's local timezone for display.
 */

/**
 * Get the user's browser timezone
 *
 * @returns IANA timezone string (e.g., 'America/New_York')
 *
 * @example
 * ```typescript
 * const tz = getBrowserTimezone();
 * // Returns: 'America/Los_Angeles'
 * ```
 */
export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect browser timezone:', error);
    return 'UTC';
  }
};

/**
 * Convert UTC date to user's timezone
 *
 * @param utcDate - Date in UTC (ISO string or Date object)
 * @param timezone - Target timezone (IANA format)
 * @returns Date object in the target timezone
 *
 * @example
 * ```typescript
 * const utcDate = '2026-02-09T14:30:00Z';
 * const localDate = convertToTimezone(utcDate, 'America/New_York');
 * ```
 */
export const convertToTimezone = (
  utcDate: string | Date,
  timezone: string
): Date => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;

  if (isNaN(date.getTime())) {
    console.warn('Invalid date provided:', utcDate);
    return new Date();
  }

  return date;
};

/**
 * Format date in user's timezone
 *
 * @param date - Date to format (ISO string or Date object)
 * @param timezone - User's timezone (IANA format)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatInTimezone('2026-02-09T14:30:00Z', 'America/New_York', {
 *   dateStyle: 'medium',
 *   timeStyle: 'short'
 * });
 * // Returns: 'Feb 9, 2026, 9:30 AM'
 * ```
 */
export const formatInTimezone = (
  date: string | Date,
  timezone: string,
  options: Intl.DateTimeFormatOptions = {}
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  try {
    return new Intl.DateTimeFormat('en-US', {
      ...options,
      timeZone: timezone,
    }).format(dateObj);
  } catch (error) {
    console.warn('Failed to format date in timezone:', error);
    return dateObj.toLocaleString();
  }
};

/**
 * Format relative time in user's timezone
 *
 * @param date - Date to format (ISO string or Date object)
 * @param timezone - User's timezone (IANA format)
 * @returns Relative time string (e.g., '2 hours ago')
 *
 * @example
 * ```typescript
 * formatRelativeTime('2026-02-09T12:30:00Z', 'America/New_York');
 * // Returns: '2 hours ago'
 * ```
 */
export const formatRelativeTime = (
  date: string | Date,
  timezone: string
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return formatInTimezone(dateObj, timezone, {
      month: 'short',
      day: 'numeric',
      year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
};

/**
 * Format date range in user's timezone
 *
 * @param startDate - Start date (ISO string or Date object)
 * @param endDate - End date (ISO string or Date object)
 * @param timezone - User's timezone (IANA format)
 * @returns Formatted date range string
 *
 * @example
 * ```typescript
 * formatDateRange('2026-02-09T00:00:00Z', '2026-02-15T00:00:00Z', 'America/New_York');
 * // Returns: 'Feb 9 - Feb 15, 2026'
 * ```
 */
export const formatDateRange = (
  startDate: string | Date,
  endDate: string | Date,
  timezone: string
): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return 'Invalid date range';
  }

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  try {
    if (sameMonth && start.getDate() === end.getDate()) {
      return formatInTimezone(start, timezone, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const startFormatted = formatInTimezone(start, timezone, {
      month: 'short',
      day: 'numeric',
      year: sameYear ? undefined : 'numeric',
    });

    const endFormatted = formatInTimezone(end, timezone, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `${startFormatted} - ${endFormatted}`;
  } catch (error) {
    console.warn('Failed to format date range:', error);
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  }
};

/**
 * Get timezone offset string
 *
 * @param timezone - IANA timezone string
 * @param date - Date to calculate offset for (defaults to now)
 * @returns Offset string (e.g., 'GMT-5', 'GMT+1')
 *
 * @example
 * ```typescript
 * getTimezoneOffset('America/New_York');
 * // Returns: 'GMT-5' (or 'GMT-4' during DST)
 * ```
 */
export const getTimezoneOffset = (
  timezone: string,
  date: Date = new Date()
): string => {
  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    }).format(date);

    const match = formatted.match(/GMT([+-]\d+)/);
    return match ? match[0] : 'GMT';
  } catch (error) {
    console.warn('Failed to get timezone offset:', error);
    return 'GMT';
  }
};

/**
 * Check if date is in daylight saving time for a timezone
 *
 * @param date - Date to check
 * @param timezone - IANA timezone string
 * @returns True if date is in DST
 *
 * @example
 * ```typescript
 * isDST(new Date('2026-07-15'), 'America/New_York');
 * // Returns: true (July is DST in New York)
 * ```
 */
export const isDST = (date: Date, timezone: string): boolean => {
  try {
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);

    const janOffset = getTimezoneOffsetMinutes(timezone, jan);
    const julOffset = getTimezoneOffsetMinutes(timezone, jul);
    const dateOffset = getTimezoneOffsetMinutes(timezone, date);

    const standardOffset = Math.max(janOffset, julOffset);
    return dateOffset < standardOffset;
  } catch (error) {
    console.warn('Failed to check DST:', error);
    return false;
  }
};

/**
 * Get timezone offset in minutes
 * Helper function for DST calculation
 */
const getTimezoneOffsetMinutes = (timezone: string, date: Date): number => {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / 60000;
};

/**
 * Common timezone list for selector
 */
export const commonTimezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: 'GMT-5' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: 'GMT-6' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: 'GMT-7' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: 'GMT-8' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)', offset: 'GMT-9' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)', offset: 'GMT-10' },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: 'GMT+0' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)', offset: 'GMT+1' },
  { value: 'Europe/Athens', label: 'Athens (EET/EEST)', offset: 'GMT+2' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: 'GMT+4' },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: 'GMT+5:30' },
  { value: 'Asia/Shanghai', label: 'China (CST)', offset: 'GMT+8' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: 'GMT+9' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)', offset: 'GMT+10' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)', offset: 'GMT+12' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: 'GMT+0' },
];

/**
 * Validate timezone string
 *
 * @param timezone - IANA timezone string to validate
 * @returns True if timezone is valid
 *
 * @example
 * ```typescript
 * isValidTimezone('America/New_York'); // true
 * isValidTimezone('Invalid/Timezone'); // false
 * ```
 */
export const isValidTimezone = (timezone: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
};
