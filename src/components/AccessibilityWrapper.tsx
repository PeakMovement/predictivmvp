import { useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { handleKeyboardShortcut, KEYBOARD_SHORTCUTS } from '@/lib/accessibility';
import { useToast } from '@/hooks/use-toast';

interface AccessibilityWrapperProps {
  children: ReactNode;
}

export function AccessibilityWrapper({ children }: AccessibilityWrapperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const handlers: Record<string, () => void> = {
        'ctrl+k': () => {
          toast({
            title: 'Search',
            description: 'Search functionality coming soon',
          });
        },
        'shift+?': () => {
          showKeyboardShortcuts();
        },
        'ctrl+d': () => {
          navigate('/dashboard');
        },
        'ctrl+h': () => {
          navigate('/health');
        },
        'ctrl+t': () => {
          navigate('/training');
        },
        'ctrl+,': () => {
          navigate('/settings');
        },
        'ctrl+r': () => {
          event.preventDefault();
          window.location.reload();
        },
      };

      handleKeyboardShortcut(event, handlers);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate, toast]);

  const showKeyboardShortcuts = () => {
    const shortcuts = Object.entries(KEYBOARD_SHORTCUTS)
      .map(([, value]) => {
        const keys = [];
        if (value.ctrl) keys.push('Ctrl');
        if (value.shift) keys.push('Shift');
        keys.push(value.key.toUpperCase());
        return `${keys.join('+')} - ${value.description}`;
      })
      .join('\n');

    toast({
      title: 'Keyboard Shortcuts',
      description: shortcuts,
      duration: 10000,
    });
  };

  return (
    <>
      {/* Skip to main content link */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Announce current page to screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {`Navigated to ${location.pathname.replace('/', '') || 'home'} page`}
      </div>

      {/* Main content with ID for skip link */}
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
    </>
  );
}
