/**
 * Accessibility utilities and helpers for improved screen reader support and keyboard navigation
 */

/**
 * Announces dynamic content changes to screen readers
 * @param message - The message to announce
 * @param priority - 'polite' for non-urgent, 'assertive' for urgent announcements
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Trap focus within a modal or dialog
 * @param element - The container element to trap focus within
 */
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const firstFocusable = focusableElements[0] as HTMLElement;
  const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };

  element.addEventListener('keydown', handleTabKey);

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Check if an element is visible to screen readers
 * @param element - The element to check
 */
export const isVisibleToScreenReader = (element: HTMLElement): boolean => {
  const style = window.getComputedStyle(element);
  const ariaHidden = element.getAttribute('aria-hidden') === 'true';

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    !ariaHidden
  );
};

/**
 * Calculate color contrast ratio between two colors
 * @param foreground - Foreground color in hex or rgb
 * @param background - Background color in hex or rgb
 * @returns Contrast ratio (1-21)
 */
export const getContrastRatio = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    // Convert hex to RGB
    let r: number, g: number, b: number;

    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      r = parseInt(hex.substr(0, 2), 16) / 255;
      g = parseInt(hex.substr(2, 2), 16) / 255;
      b = parseInt(hex.substr(4, 2), 16) / 255;
    } else if (color.startsWith('rgb')) {
      const match = color.match(/\d+/g);
      if (!match) return 0;
      r = parseInt(match[0]) / 255;
      g = parseInt(match[1]) / 255;
      b = parseInt(match[2]) / 255;
    } else {
      return 0;
    }

    // Calculate relative luminance
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Check if contrast ratio meets WCAG AA standard
 * @param ratio - The contrast ratio
 * @param isLargeText - Whether the text is large (18pt+ or 14pt+ bold)
 */
export const meetsWCAGAA = (ratio: number, isLargeText = false): boolean => {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Check if contrast ratio meets WCAG AAA standard
 * @param ratio - The contrast ratio
 * @param isLargeText - Whether the text is large
 */
export const meetsWCAGAAA = (ratio: number, isLargeText = false): boolean => {
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
};

/**
 * Keyboard shortcuts configuration
 */
export const KEYBOARD_SHORTCUTS = {
  SEARCH: { key: 'k', ctrl: true, description: 'Open search' },
  HELP: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  DASHBOARD: { key: 'd', ctrl: true, description: 'Go to dashboard' },
  HEALTH: { key: 'h', ctrl: true, description: 'Go to health page' },
  TRAINING: { key: 't', ctrl: true, description: 'Go to training page' },
  SETTINGS: { key: ',', ctrl: true, description: 'Open settings' },
  REFRESH: { key: 'r', ctrl: true, description: 'Refresh current page' },
} as const;

/**
 * Handle keyboard shortcuts
 * @param event - Keyboard event
 * @param handlers - Map of shortcut keys to handler functions
 */
export const handleKeyboardShortcut = (
  event: KeyboardEvent,
  handlers: Record<string, () => void>
) => {
  const key = event.key.toLowerCase();
  const ctrl = event.ctrlKey || event.metaKey;
  const shift = event.shiftKey;

  // Create shortcut key string
  let shortcutKey = '';
  if (ctrl) shortcutKey += 'ctrl+';
  if (shift) shortcutKey += 'shift+';
  shortcutKey += key;

  const handler = handlers[shortcutKey];
  if (handler) {
    event.preventDefault();
    handler();
  }
};

/**
 * Skip to main content link helper
 * @param contentId - ID of the main content element
 */
export const skipToContent = (contentId: string) => {
  const element = document.getElementById(contentId);
  if (element) {
    element.focus();
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
