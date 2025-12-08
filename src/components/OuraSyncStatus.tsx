import { Clock, AlertCircle, WifiOff, Zap } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";

const OuraSyncStatus = () => {
  const { isConnected, lastSync, error: tokenError, errorCode: tokenErrorCode } = useOuraTokenStatus();

  const getTimeSinceSync = () => {
    if (!lastSync) return "Auto-sync enabled";
    return `Synced ${formatDistanceToNowStrict(lastSync)} ago`;
  };

  const getStatusIcon = () => {
    if (tokenErrorCode === "NO_TOKEN" || tokenErrorCode === "NOT_AUTHENTICATED") {
      return <WifiOff className="h-3 w-3 text-amber-500" />;
    }
    if (tokenErrorCode === "TOKEN_EXPIRED") {
      return <AlertCircle className="h-3 w-3 text-amber-500" />;
    }
    if (tokenError) return <AlertCircle className="h-3 w-3 text-red-500" />;
    if (isConnected) return <Zap className="h-3 w-3 text-green-500" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (tokenErrorCode === "NO_TOKEN") return "Connect Oura in Settings";
    if (tokenErrorCode === "TOKEN_EXPIRED") return "Reconnect Oura in Settings";
    if (tokenError) return tokenError;
    return getTimeSinceSync();
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground px-3 py-1.5 rounded-full bg-muted/50">
      {getStatusIcon()}
      <span className={tokenErrorCode ? "text-amber-500" : ""}>
        {getStatusText()}
      </span>
      {isConnected && !tokenError && (
        <span className="text-green-500 ml-1">• Auto</span>
      )}
    </div>
  );
};

export default OuraSyncStatus;