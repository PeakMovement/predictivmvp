import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GarminExpiredBannerProps {
  onReconnect: () => void;
  className?: string;
}

export function GarminExpiredBanner({ onReconnect, className }: GarminExpiredBannerProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 text-sm animate-fade-in ${className ?? ""}`}
      role="alert"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>Your Garmin connection has expired.</strong>{" "}
          Reconnect in Settings to resume syncing.
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onReconnect}
        className="shrink-0 border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20"
      >
        Reconnect
      </Button>
    </div>
  );
}
