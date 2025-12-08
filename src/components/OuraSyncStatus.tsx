import { formatDistanceToNowStrict } from "date-fns";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";
import { CheckCircle2, Circle } from "lucide-react";

const OuraSyncStatus = () => {
  const { isConnected, lastSync } = useOuraTokenStatus();

  const getTimeSinceSync = () => {
    if (!lastSync) return "Auto-sync enabled • Data updates automatically";
    return `Synced ${formatDistanceToNowStrict(lastSync)} ago`;
  };

  const getStatusIcon = () => {
    if (isConnected) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    return <Circle className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {getStatusIcon()}
        <span>{getTimeSinceSync()}</span>
      </div>
      {isConnected && (
        <span className="text-green-500/80">Auto-sync enabled • Data updates automatically</span>
      )}
    </div>
  );
};

export default OuraSyncStatus;