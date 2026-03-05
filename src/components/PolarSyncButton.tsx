import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PolarSyncButtonProps {
  isConnected: boolean;
  onSyncComplete?: () => void;
}

export const PolarSyncButton = ({ isConnected, onSyncComplete }: PolarSyncButtonProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const syncPolarData = async () => {
    if (!isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect your Polar device first",
        variant: "destructive",
      });
      return;
    }

    setIsSyncing(true);
    let exercisesSynced = 0;
    let sleepSynced = 0;
    let hasError = false;
    let errorMessage = "";

    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const exerciseResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-polar-exercises`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (exerciseResponse.status === 403) {
        const data = await exerciseResponse.json();
        if (data.error === "consent_required") {
          toast({
            title: "Consent Required",
            description: (
              <div className="space-y-2">
                <p>Please accept consents at:</p>
                <a
                  href="https://account.polar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  https://account.polar.com
                </a>
              </div>
            ),
            variant: "destructive",
            duration: 8000,
          });
          setIsSyncing(false);
          return;
        }
      }

      if (exerciseResponse.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Reconnect Polar to continue",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      if (exerciseResponse.ok) {
        const exerciseData = await exerciseResponse.json();
        exercisesSynced = exerciseData.synced || 0;
      } else {
        hasError = true;
        errorMessage = "Failed to sync exercises";
      }

      const sleepResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-polar-sleep`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (sleepResponse.status === 403) {
        const data = await sleepResponse.json();
        if (data.error === "consent_required") {
          toast({
            title: "Consent Required",
            description: (
              <div className="space-y-2">
                <p>Please accept consents at:</p>
                <a
                  href="https://account.polar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  https://account.polar.com
                </a>
              </div>
            ),
            variant: "destructive",
            duration: 8000,
          });
          setIsSyncing(false);
          return;
        }
      }

      if (sleepResponse.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Reconnect Polar to continue",
          variant: "destructive",
        });
        setIsSyncing(false);
        return;
      }

      if (sleepResponse.ok) {
        const sleepData = await sleepResponse.json();
        sleepSynced = sleepData.synced || 0;
      } else {
        hasError = true;
        errorMessage = errorMessage || "Failed to sync sleep data";
      }

      if (hasError) {
        toast({
          title: "Sync Incomplete",
          description: errorMessage,
          variant: "destructive",
        });
      } else {
        const totalSynced = exercisesSynced + sleepSynced;
        toast({
          title: `Sync successful! 🎉`,
          description: `Synced ${exercisesSynced} exercise${exercisesSynced !== 1 ? 's' : ''} and ${sleepSynced} sleep session${sleepSynced !== 1 ? 's' : ''}`,
        });

        if (onSyncComplete) {
          onSyncComplete();
        }
      }
    } catch (error) {
      console.error("Polar sync error:", error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <Button
      onClick={syncPolarData}
      disabled={isSyncing}
      size="sm"
      variant="outline"
      className="bg-glass/30 border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200"
    >
      <RefreshCw size={14} className={`mr-2 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing..." : "Sync Data"}
    </Button>
  );
};
