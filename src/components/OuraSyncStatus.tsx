import { formatDistanceToNowStrict } from "date-fns";
import { useOuraTokenStatus } from "@/hooks/useOuraTokenStatus";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STALE_HOURS = 24;

interface OuraSyncStatusProps {
  onSync?: () => void;
  isSyncing?: boolean;
}

const OuraSyncStatus = ({ onSync, isSyncing = false }: OuraSyncStatusProps) => {
  const { isConnected: ouraConnected, lastSync: ouraLastSync, errorCode } = useOuraTokenStatus();
  const [garminConnected, setGarminConnected] = useState(false);
  const [garminLastSync, setGarminLastSync] = useState<Date | null>(null);
  const [polarConnected, setPolarConnected] = useState(false);
  const [polarLastSync, setPolarLastSync] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatuses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Garmin lives in wearable_tokens with scope='garmin'
      const { data: garminToken } = await supabase
        .from("wearable_tokens")
        .select("scope")
        .eq("user_id", user.id)
        .eq("scope", "garmin")
        .maybeSingle();

      if (garminToken) {
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

      // Polar lives in its own polar_tokens table
      const { data: polarToken } = await supabase
        .from("polar_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (polarToken) {
        setPolarConnected(true);
        const { data: lastSession } = await supabase
          .from("wearable_sessions")
          .select("fetched_at")
          .eq("user_id", user.id)
          .eq("source", "polar")
          .order("fetched_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastSession?.fetched_at) {
          setPolarLastSync(new Date(lastSession.fetched_at));
        }
      }
    };

    checkStatuses();
  }, []);

  const anyConnected = ouraConnected || garminConnected || polarConnected;
  const latestSync = [ouraLastSync, garminLastSync, polarLastSync]
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0];

  const tokenExpired = errorCode === "TOKEN_EXPIRED";
  const hoursSinceSync = latestSync
    ? (Date.now() - latestSync.getTime()) / (1000 * 60 * 60)
    : null;
  const isStale = hoursSinceSync !== null && hoursSinceSync > STALE_HOURS;

  const getStatusText = () => {
    if (tokenExpired) return "Wearable · Connection Expired";
    if (!anyConnected) return "Wearable · Not Connected";
    if (isStale) return "Wearable · Sync Required";
    return "Wearable · Synced";
  };

  const statusColor = tokenExpired || isStale || !anyConnected
    ? "text-amber"
    : "text-bioGreen";

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-[7px] tracking-[3px] uppercase ${statusColor}`}>
        {getStatusText()}
      </span>
      {onSync && anyConnected && (
        <button
          onClick={onSync}
          disabled={isSyncing}
          title="Sync now"
          className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30"
        >
          <RefreshCw className={`h-3 w-3 text-muted-foreground/60 ${isSyncing ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
};

export default OuraSyncStatus;
