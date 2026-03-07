import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Watch, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingWearableProps {
  onNext: () => void;
  onBack: () => void;
}

interface ConnectionStatus {
  oura: boolean;
  garmin: boolean;
  polar: boolean;
}

export const OnboardingWearable = ({}: OnboardingWearableProps) => {
  const [connected, setConnected] = useState<ConnectionStatus>({ oura: false, garmin: false, polar: false });
  const [connecting, setConnecting] = useState<"oura" | "garmin" | "polar" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkAllConnections();
  }, []);

  const checkAllConnections = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [wearableRes, polarRes] = await Promise.all([
        supabase.from("wearable_tokens").select("scope").eq("user_id", user.id),
        supabase.from("polar_tokens" as any).select("id").eq("user_id", user.id).maybeSingle(),
      ]);

      const scopes = wearableRes.data?.map((r) => r.scope) ?? [];
      setConnected({
        oura: scopes.includes("oura"),
        garmin: scopes.includes("garmin"),
        polar: !!polarRes.data,
      });
    } catch (err) {
      console.error("Error checking wearable connections:", err);
    }
  };

  const connectOura = async () => {
    setConnecting("oura");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");
      const { data, error } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });
      if (error || !data?.auth_url) throw new Error(data?.error || "Failed to build Oura auth URL");
      window.location.href = data.auth_url;
    } catch (err) {
      toast({ title: "Connection failed", description: err instanceof Error ? err.message : "Failed to start Oura connection", variant: "destructive" });
      setConnecting(null);
    }
  };

  const connectGarmin = async () => {
    setConnecting("garmin");
    try {
      const { data, error } = await supabase.functions.invoke("garmin-auth-initiate");
      if (error || !data?.auth_url) throw new Error(data?.error || "Failed to initiate Garmin connection");
      window.location.href = data.auth_url;
    } catch (err) {
      toast({ title: "Connection failed", description: err instanceof Error ? err.message : "Failed to start Garmin connection", variant: "destructive" });
      setConnecting(null);
    }
  };

  const connectPolar = async () => {
    setConnecting("polar");
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) throw new Error("You must be logged in");
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polar-auth-initiate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to initiate Polar connection");
      const data = await response.json();
      if (!data?.auth_url) throw new Error("No authorization URL received");
      window.location.href = data.auth_url;
    } catch (err) {
      toast({ title: "Connection failed", description: err instanceof Error ? err.message : "Failed to start Polar connection", variant: "destructive" });
      setConnecting(null);
    }
  };

  const anyConnected = connected.oura || connected.garmin || connected.polar;

  const devices = [
    {
      id: "oura" as const,
      name: "Oura Ring",
      description: "Sleep, activity, and recovery",
      gradient: "from-purple-500 to-indigo-500",
      connect: connectOura,
    },
    {
      id: "garmin" as const,
      name: "Garmin",
      description: "GPS, heart rate, and performance",
      gradient: "from-blue-500 to-cyan-500",
      connect: connectGarmin,
    },
    {
      id: "polar" as const,
      name: "Polar",
      description: "Heart rate, sleep, and training load",
      gradient: "from-red-500 to-orange-500",
      connect: connectPolar,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Watch className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Connect Your Wearable</h2>
        <p className="text-muted-foreground">
          Link your device to start tracking your health data
        </p>
      </div>

      <div className="space-y-3">
        {devices.map((device) => (
          <div key={device.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${device.gradient} rounded-full flex items-center justify-center shrink-0`}>
                  <div className="w-4 h-4 rounded-full border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{device.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {connected[device.id] ? "Connected" : device.description}
                  </p>
                </div>
              </div>
              {connected[device.id] ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <Button
                  onClick={device.connect}
                  disabled={connecting !== null}
                  size="sm"
                >
                  {connecting === device.id ? (
                    <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />Connecting...</>
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {anyConnected && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-600 dark:text-green-400">
          Device connected — your data will start syncing in the background.
        </div>
      )}

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <p className="text-sm text-blue-600 dark:text-blue-400">
          You can skip this step and connect later from Settings.
        </p>
      </div>
    </div>
  );
};
