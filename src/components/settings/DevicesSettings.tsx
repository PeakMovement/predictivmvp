import { useState, useEffect } from "react";
import { Zap, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ConnectGarminButton } from "@/components/ConnectGarminButton";
import { ConnectPolarButton } from "@/components/ConnectPolarButton";
import { useWearableSync } from "@/hooks/useWearableSync";
import { useToast } from "@/hooks/use-toast";
import { LayoutBlock } from "@/components/layout/LayoutBlock";
import { useGarminTokenStatus } from "@/hooks/useGarminTokenStatus";
import { GarminAttribution } from "@/components/GarminAttribution";

interface DevicesSettingsProps {
  isSectionVisible: (id: string) => boolean;
}

export const DevicesSettings = ({ isSectionVisible }: DevicesSettingsProps) => {
  const [isGarminConnected, setIsGarminConnected] = useState(false);
  const [isPolarConnected, setIsPolarConnected] = useState(false);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { isConnected } = useWearableSync();
  const { toast } = useToast();
  const { isExpired: garminTokenExpired } = useGarminTokenStatus();

  useEffect(() => {
    checkGarminConnection();
    checkPolarConnection();
    fetchLastSync();
  }, []);

  const checkPolarConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("polar_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsPolarConnected(!!data);
    } catch (error) {
      console.error("Error checking Polar connection:", error);
    }
  };

  const fetchLastSync = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("wearable_tokens")
      .select("updated_at")
      .eq("user_id", user.id)
      .eq("scope", "oura")
      .maybeSingle();
    if (data?.updated_at) setLastSyncTime(new Date(data.updated_at));
  };

  const checkGarminConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("wearable_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .eq("scope", "garmin")
        .maybeSingle();
      setIsGarminConnected(!!data);
    } catch (error) {
      console.error("Error checking Garmin connection:", error);
    }
  };

  const connectOura = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("You must be logged in to connect your wearable");
      const { data, error } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });
      if (error || !data?.auth_url) throw new Error(data?.error || "Failed to build Oura auth URL");
      window.location.href = data.auth_url;
    } catch (err) {
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to start wearable connection",
        variant: "destructive",
      });
    }
  };

  // Helper: delete rows and return the count actually deleted. Supabase RLS
  // blocks return 0 rows silently with no error — `.select()` surfaces that.
  const deleteReturnCount = async (
    query: ReturnType<typeof supabase.from>,
  ) => {
    // @ts-expect-error — chained builder typing is flexible
    const { data, error } = await query.select();
    return { error, count: Array.isArray(data) ? data.length : 0 };
  };

  const disconnectDevice = async (
    label: string,
    deleter: (userIdValue: string) => Promise<{ error: unknown; count: number }>,
  ) => {
    if (!confirm(`Disconnect ${label}? You'll need to reconnect to resume syncing.`)) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error, count } = await deleter(user.id);
      if (error) throw error;
      if (count === 0) {
        throw new Error(
          "Nothing was deleted. Your session may have expired — sign out and back in, then try again.",
        );
      }
      toast({ title: `${label} disconnected`, description: "Sync has stopped." });
      // Reload so every connection-state consumer (OuraSyncStatus, Dashboard
      // checklist, etc.) picks up the change — avoids stale UI after delete.
      setTimeout(() => window.location.reload(), 400);
    } catch (err) {
      toast({
        title: "Disconnect failed",
        description: err instanceof Error ? err.message : `Couldn't disconnect ${label}.`,
        variant: "destructive",
      });
    }
  };

  const disconnectOura = () =>
    disconnectDevice("Oura", async (uid) => {
      const [oura, wearable] = await Promise.all([
        deleteReturnCount(
          supabase.from("oura_tokens" as any).delete().eq("user_id", uid) as any,
        ),
        deleteReturnCount(
          supabase.from("wearable_tokens").delete().eq("user_id", uid).eq("scope", "oura") as any,
        ),
      ]);
      const error = oura.error || wearable.error;
      const count = oura.count + wearable.count;
      return { error, count };
    });

  const disconnectGarmin = () =>
    disconnectDevice("Garmin", (uid) =>
      deleteReturnCount(
        supabase.from("wearable_tokens").delete().eq("user_id", uid).eq("scope", "garmin") as any,
      ),
    );

  const disconnectPolar = () =>
    disconnectDevice("Polar", (uid) =>
      deleteReturnCount(
        supabase.from("polar_tokens").delete().eq("user_id", uid) as any,
      ),
    );

  return (
    <LayoutBlock
      blockId="devices"
      displayName="Connected Devices"
      pageId="profile"
      size="standard"
      visible={isSectionVisible("devices")}
    >
      <div className="bg-glass rounded-md border border-glass-border p-6 hover:bg-glass-highlight transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary/20 rounded-md flex items-center justify-center">
            <Smartphone size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Connected Devices</h3>
        </div>
        <div className="space-y-3">
          <div className="w-full flex items-center justify-between p-4 rounded-md border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-primary/15 border border-primary/30 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-primary" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground flex items-center gap-2">
                  Wearable (Oura)
                  {isConnected && (
                    <span className="text-xs px-2 py-0.5 bg-bioGreen/20 text-bioGreen border border-bioGreen/30">
                      Connected
                    </span>
                  )}
                </p>
                {isConnected ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap size={12} className="text-bioGreen" />
                      Auto-sync enabled
                    </p>
                    {lastSyncTime && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {lastSyncTime.toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Connect and sync your wearable data</p>
                )}
              </div>
            </div>
            {!isConnected ? (
              <Button onClick={connectOura} size="sm" className="bg-primary/80 hover:bg-primary text-primary-foreground">
                Connect Wearable
              </Button>
            ) : (
              <Button
                onClick={disconnectOura}
                size="sm"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                Disconnect
              </Button>
            )}
          </div>

          <div className={`w-full flex items-center justify-between p-4  border transition-all duration-200 ${
            garminTokenExpired
              ? "bg-destructive/5 border-destructive/30"
              : "bg-glass/30 border-glass-border hover:bg-glass-highlight"
          }`}>
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-[#7ECBA1]/15 border border-[#7ECBA1]/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#7ECBA1]">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                  Wearable (Garmin)
                  {garminTokenExpired ? (
                    <span className="text-xs px-2 py-0.5 bg-destructive/20 text-destructive border border-destructive/30 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      Reconnection needed
                    </span>
                  ) : isGarminConnected ? (
                    <span className="text-xs px-2 py-0.5 bg-bioGreen/20 text-bioGreen border border-bioGreen/30">
                      Connected
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {garminTokenExpired
                    ? "Your Garmin token has expired — reconnect to resume syncing"
                    : isGarminConnected
                    ? "Syncing your wearable data"
                    : "Connect and sync your wearable data"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isGarminConnected && (
                <Button
                  onClick={disconnectGarmin}
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Disconnect
                </Button>
              )}
              <ConnectGarminButton
                isConnected={isGarminConnected}
                onConnectionChange={checkGarminConnection}
                isExpired={garminTokenExpired}
                userId={userId}
              />
            </div>
          </div>
          <GarminAttribution variant="inline" className="px-4 pb-3 pt-1" />

          {/* Polar */}
          <div className="w-full flex items-center justify-between p-4 border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-[#C46B6B]/15 border border-[#C46B6B]/30 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#C46B6B]">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                  Wearable (Polar)
                  {isPolarConnected && (
                    <span className="text-xs px-2 py-0.5 bg-bioGreen/20 text-bioGreen border border-bioGreen/30">
                      Connected
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isPolarConnected
                    ? "Auto-syncing every 4 hours"
                    : "Connect and sync your Polar exercises and sleep"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isPolarConnected && (
                <Button
                  onClick={disconnectPolar}
                  size="sm"
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  Disconnect
                </Button>
              )}
              <ConnectPolarButton
                isConnected={isPolarConnected}
                onConnectionChange={checkPolarConnection}
              />
            </div>
          </div>
        </div>
      </div>
    </LayoutBlock>
  );
};
