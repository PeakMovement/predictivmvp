import { useState, useEffect } from "react";
import { Zap, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ConnectGarminButton } from "@/components/ConnectGarminButton";
import { useWearableSync } from "@/hooks/useWearableSync";
import { useToast } from "@/hooks/use-toast";
import { LayoutBlock } from "@/components/layout/LayoutBlock";

interface DevicesSettingsProps {
  isSectionVisible: (id: string) => boolean;
}

export const DevicesSettings = ({ isSectionVisible }: DevicesSettingsProps) => {
  const [isGarminConnected, setIsGarminConnected] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { isConnected } = useWearableSync();
  const { toast } = useToast();

  useEffect(() => {
    checkGarminConnection();
    fetchLastSync();
  }, []);

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
      if (authError || !user) throw new Error("You must be logged in to connect your Oura Ring");
      const { data, error } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });
      if (error || !data?.auth_url) throw new Error(data?.error || "Failed to build Oura auth URL");
      window.location.href = data.auth_url;
    } catch (err) {
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to start Oura connection",
        variant: "destructive",
      });
    }
  };

  return (
    <LayoutBlock
      blockId="devices"
      displayName="Connected Devices"
      pageId="profile"
      size="standard"
      visible={isSectionVisible("devices")}
    >
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight transition-all duration-300">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
            <Smartphone size={16} className="text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Connected Devices</h3>
        </div>
        <div className="space-y-3">
          <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 rounded-full border-2 border-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground flex items-center gap-2">
                  Oura Ring
                  {isConnected && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                      Connected
                    </span>
                  )}
                </p>
                {isConnected ? (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Zap size={12} className="text-green-500" />
                      Auto-sync enabled
                    </p>
                    {lastSyncTime && (
                      <p className="text-xs text-muted-foreground">
                        Last synced: {lastSyncTime.toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Connect and sync your Oura Ring data</p>
                )}
              </div>
            </div>
            {!isConnected && (
              <Button onClick={connectOura} size="sm" className="bg-primary/80 hover:bg-primary text-primary-foreground">
                Connect Oura Ring
              </Button>
            )}
          </div>

          <div className="w-full flex items-center justify-between p-4 rounded-xl border bg-glass/30 border-glass-border hover:bg-glass-highlight transition-all duration-200">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-foreground flex items-center gap-2">
                  Garmin
                  {isGarminConnected && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                      Connected
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isGarminConnected ? "Syncing your Garmin health data" : "Connect and sync your Garmin health data"}
                </p>
              </div>
            </div>
            <ConnectGarminButton isConnected={isGarminConnected} onConnectionChange={checkGarminConnection} />
          </div>
        </div>
      </div>
    </LayoutBlock>
  );
};
