import { formatDistanceToNowStrict } from "date-fns";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";
import { CheckCircle2, Circle, AlertTriangle, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STALE_HOURS = 24;

const OuraSyncStatus = () => {
  const { isConnected: ouraConnected, lastSync: ouraLastSync, errorCode } = useOuraTokenStatus();
  const [garminConnected, setGarminConnected] = useState(false);
  const [garminLastSync, setGarminLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const checkGarminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: token } = await supabase
        .from("wearable_tokens")
        .select("scope")
        .eq("user_id", user.id)
        .eq("scope", "garmin")
        .maybeSingle();

      if (token) {
        setGarminConnected(true);

        const { data: lastSession } = await supabase
          .from("wearable_sessions")
          .select("fetched_at")
          .eq("user_id", user.id)
          .eq("source", "garmin")
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSession?.fetched_at) {
          setGarminLastSync(new Date(lastSession.fetched_at));
        }
      }
    };

    checkGarminStatus();
  }, []);

  const connectedDevices: string[] = [];
  if (ouraConnected) connectedDevices.push("Oura Ring");
  if (garminConnected) connectedDevices.push("Garmin");

  const latestSync = [ouraLastSync, garminLastSync]
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0];

  const tokenExpired = errorCode === "TOKEN_EXPIRED";
  const hoursSinceSync = latestSync
    ? (Date.now() - latestSync.getTime()) / (1000 * 60 * 60)
    : null;
  const isStale = hoursSinceSync !== null && hoursSinceSync > STALE_HOURS;

  const getStatusIcon = () => {
    if (tokenExpired) return <WifiOff className="h-3 w-3 text-amber-500" />;
    if (isStale) return <AlertTriangle className="h-3 w-3 text-amber-500" />;
    if (connectedDevices.length > 0) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    return <Circle className="h-3 w-3 text-muted-foreground" />;
  };

  const getDeviceText = () => {
    if (tokenExpired) return "Oura connection expired — reconnect in Settings";
    if (connectedDevices.length === 0) return "No devices connected";
    return connectedDevices.join(" & ");
  };

  const getSyncText = () => {
    if (tokenExpired) return null;
    if (!latestSync) return "Waiting for first sync";
    const distance = formatDistanceToNowStrict(latestSync);
    if (isStale) return `Last synced ${distance} ago — data may be out of date`;
    return `Synced ${distance} ago`;
  };

  const syncText = getSyncText();
  const syncColor = tokenExpired || isStale ? "text-amber-500" : "text-green-500/80";

  return (
    <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {getStatusIcon()}
        <span className={tokenExpired ? "text-amber-500" : undefined}>{getDeviceText()}</span>
      </div>
      {syncText && (
        <span className={syncColor}>{syncText}</span>
      )}
    </div>
  );
};

export default OuraSyncStatus;