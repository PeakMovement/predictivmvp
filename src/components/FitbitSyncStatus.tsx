import { RefreshCw, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFitbitSync } from "@/hooks/useFitbitSync";
import { formatDistanceToNow } from "date-fns";

interface FitbitSyncStatusProps {
  showDetails?: boolean;
  className?: string;
}

export const FitbitSyncStatus = ({ showDetails = true, className }: FitbitSyncStatusProps) => {
  const { isConnected, isSyncing, lastSync, syncNow } = useFitbitSync();

  if (!isConnected) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}>
        <AlertCircle className="w-4 h-4" />
        <span>Fitbit not connected</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {showDetails && (
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-muted-foreground">
            Connected
          </span>
          {lastSync && (
            <div className="flex items-center gap-1.5 text-muted-foreground/70">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">
                {formatDistanceToNow(lastSync, { addSuffix: true })}
              </span>
            </div>
          )}
        </div>
      )}
      
      <Button
        onClick={syncNow}
        disabled={isSyncing}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
        {isSyncing ? "Updating..." : "Update Now"}
      </Button>
    </div>
  );
};
