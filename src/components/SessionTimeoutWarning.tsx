import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SessionTimeoutWarningProps {
  open: boolean;
  timeRemaining: string | null;
  onExtendSession: () => Promise<boolean>;
  onLogout: () => void;
  onDismiss: () => void;
}

export function SessionTimeoutWarning({
  open,
  timeRemaining,
  onExtendSession,
  onLogout,
  onDismiss,
}: SessionTimeoutWarningProps) {
  const [isExtending, setIsExtending] = useState(false);

  const handleExtend = async () => {
    setIsExtending(true);
    const success = await onExtendSession();
    setIsExtending(false);

    if (success) {
      onDismiss();
    }
  };

  const handleLogout = () => {
    onLogout();
  };

  useEffect(() => {
    if (open) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {
        console.log('Could not play notification sound');
      });
    }
  }, [open]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        className="max-w-md"
        aria-describedby="session-timeout-description"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            Session Expiring Soon
          </AlertDialogTitle>
          <AlertDialogDescription id="session-timeout-description">
            <div className="space-y-3 pt-2">
              <p>
                Your session will expire in{' '}
                <span className="font-semibold text-warning">
                  {timeRemaining}
                </span>
                .
              </p>
              <p className="text-sm">
                For your security, you'll be automatically logged out if you
                remain inactive. Would you like to stay signed in?
              </p>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  <strong>Tip:</strong> Any unsaved changes will be lost when
                  you're logged out. Save your work before the timer expires.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel
            onClick={handleLogout}
            className="sm:mr-auto"
            aria-label="Log out now"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out Now
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExtend}
            disabled={isExtending}
            className="bg-primary hover:bg-primary/90"
            aria-label="Stay signed in and extend session"
          >
            {isExtending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Extending...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Stay Signed In
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
