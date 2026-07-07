import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWearableConnections } from "@/hooks/useWearableConnections";
import { cn } from "@/lib/utils";

interface WearableReconnectBannerProps {
  className?: string;
}

/**
 * Unified re-auth prompt. Surfaces ANY expired wearable connection
 * (Oura / Garmin / Polar) with a one-tap reconnect per provider, so a
 * silently-expired token never quietly stops the user's data sync.
 */
export function WearableReconnectBanner({ className }: WearableReconnectBannerProps) {
  const { expired } = useWearableConnections();
  if (expired.length === 0) return null;

  const names = expired.map((c) => c.label).join(" and ");

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-3 rounded-lg border border-amber/40 bg-amber/10 animate-fade-in",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      role="alert"
    >
      <div className="flex items-center gap-2 min-w-0 text-sm text-yellow-700 dark:text-yellow-400">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="min-w-0">
          <strong>{names} {expired.length > 1 ? "connections have" : "connection has"} expired.</strong>{" "}
          Reconnect to resume syncing your data.
        </span>
      </div>
      <div className="flex flex-wrap gap-2 shrink-0">
        {expired.map((c) => (
          <Button
            key={c.provider}
            size="sm"
            variant="outline"
            onClick={() => c.reconnect()}
            className="border-amber/50 text-yellow-700 dark:text-yellow-400 hover:bg-amber/20"
          >
            <RefreshCw size={14} className="mr-2" />
            Reconnect {c.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
