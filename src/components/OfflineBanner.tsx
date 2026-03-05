import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi, CloudOff } from "lucide-react";
import { useOfflineStatus } from "@/hooks/useOfflineStatus";
import { cn } from "@/lib/utils";

export const OfflineBanner = () => {
  const { isOffline, wasOffline } = useOfflineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingActions, setPendingActions] = useState(0);

  useEffect(() => {
    if (!isOffline && wasOffline) {
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    }
  }, [isOffline, wasOffline]);

  useEffect(() => {
    const stored = localStorage.getItem("offline_actions");
    if (stored) {
      try {
        const actions = JSON.parse(stored);
        setPendingActions(actions.length || 0);
      } catch {
        setPendingActions(0);
      }
    }

    const interval = setInterval(() => {
      const stored = localStorage.getItem("offline_actions");
      if (stored) {
        try {
          const actions = JSON.parse(stored);
          setPendingActions(actions.length || 0);
        } catch {
          setPendingActions(0);
        }
      } else {
        setPendingActions(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!isOffline && !showReconnected) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
      {isOffline ? (
        <Alert
          variant="destructive"
          className="rounded-none border-x-0 border-t-0"
        >
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CloudOff className="h-4 w-4" />
              You're offline. Changes will sync when connection is restored.
              {pendingActions > 0 && (
                <span className="text-xs bg-background/20 px-2 py-0.5 rounded-full">
                  {pendingActions} pending {pendingActions === 1 ? "action" : "actions"}
                </span>
              )}
            </span>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert
          className={cn(
            "rounded-none border-x-0 border-t-0",
            "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
          )}
        >
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            Back online! Syncing your changes...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
