import { formatDistanceToNowStrict } from "date-fns";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";
import { CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const OuraSyncStatus = () => {
  const { isConnected: ouraConnected, lastSync: ouraLastSync } = useOuraTokenStatus();
  const [garminConnected, setGarminConnected] = useState(false);
  const [garminLastSync, setGarminLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const checkGarminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: token } = await supabase
        .from("wearable_tokens")
        .select("*")
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

  const connectedDevices = [];
  if (ouraConnected) connectedDevices.push("Oura");
  if (garminConnected) connectedDevices.push("Garmin");

  const latestSync = [ouraLastSync, garminLastSync]
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0];

  const getTimeSinceSync = () => {
    if (!latestSync) return "Auto-sync enabled • Data updates automatically";
    return `Synced ${formatDistanceToNowStrict(latestSync)} ago`;
  };

  const getStatusIcon = () => {
    if (connectedDevices.length > 0) return <CheckCircle2 className="h-3 w-3 text-green-500" />;
    return <Circle className="h-3 w-3 text-muted-foreground" />;
  };

  const getDeviceText = () => {
    if (connectedDevices.length === 0) return "No devices connected";
    if (connectedDevices.length === 1) return connectedDevices[0];
    return connectedDevices.join(" & ");
  };

  return (
    <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        {getStatusIcon()}
        <span>{getDeviceText()}</span>
      </div>
      {connectedDevices.length > 0 && (
        <span className="text-green-500/80">{getTimeSinceSync()}</span>
      )}
    </div>
  );
};

export default OuraSyncStatus;