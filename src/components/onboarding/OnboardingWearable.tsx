import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingWearableProps {
  onNext: () => void;
  onBack: () => void;
}

export const OnboardingWearable = ({}: OnboardingWearableProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("wearable_tokens")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      setIsConnected(!!data);
    } catch (error) {
      console.error("Error checking connection:", error);
    }
  };

  const connectOura = async () => {
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to connect your Oura Ring");
      }

      const { data, error } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });

      if (error || !data?.auth_url) {
        throw new Error(data?.error || "Failed to build Oura auth URL");
      }

      window.location.href = data.auth_url;
    } catch (err) {
      console.error("[connectOura] Error:", err);
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to start Oura connection",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Smartphone className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Connect Your Wearable</h2>
        <p className="text-muted-foreground">
          Link your device to start tracking your health data
        </p>
      </div>

      <div className="space-y-4">
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Oura Ring</h3>
                <p className="text-sm text-muted-foreground">
                  {isConnected ? "Connected" : "Track sleep, activity, and recovery"}
                </p>
              </div>
            </div>
            {isConnected ? (
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            ) : (
              <Button
                onClick={connectOura}
                disabled={isConnecting}
                size="sm"
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            )}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-foreground text-sm">Why connect a wearable?</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✓ Automatic health data syncing</li>
            <li>✓ AI-powered insights and recommendations</li>
            <li>✓ Track trends over time</li>
            <li>✓ Get personalized daily briefings</li>
          </ul>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">
            You can skip this step and connect later from Settings if you prefer.
          </p>
        </div>
      </div>
    </div>
  );
};
