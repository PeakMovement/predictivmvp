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

    const consentToastDescription = (
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
    );

    try {
      const { data: exerciseData, error: exerciseError } = await supabase.functions.invoke(
        "fetch-polar-exercises",
      );

      if (exerciseError) {
        const msg = exerciseError.message || "";
        if (msg.includes("consent_required")) {
          toast({
            title: "Consent Required",
            description: consentToastDescription,
            variant: "destructive",
            duration: 8000,
          });
          setIsSyncing(false);
          return;
        }
        if (msg.includes("invalid_or_revoked_token") || msg.includes("401")) {
          toast({
            title: "Authentication Error",
            description: "Reconnect Polar to continue",
            variant: "destructive",
          });
          setIsSyncing(false);
          return;
        }
        hasError = true;
        errorMessage = "Failed to sync exercises";
      } else {
        exercisesSynced = exerciseData?.synced || 0;
      }

      const { data: sleepData, error: sleepError } = await supabase.functions.invoke(
        "fetch-polar-sleep",
      );

      if (sleepError) {
        const msg = sleepError.message || "";
        if (msg.includes("consent_required")) {
          toast({
            title: "Consent Required",
            description: consentToastDescription,
            variant: "destructive",
            duration: 8000,
          });
          setIsSyncing(false);
          return;
        }
        if (msg.includes("invalid_or_revoked_token") || msg.includes("401")) {
          toast({
            title: "Authentication Error",
            description: "Reconnect Polar to continue",
            variant: "destructive",
          });
          setIsSyncing(false);
          return;
        }
        hasError = true;
        errorMessage = errorMessage || "Failed to sync sleep data";
      } else {
        sleepSynced = sleepData?.synced || 0;
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
          title: `Sync successful! `,
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
      className="bg-primary/80 hover:bg-primary text-primary-foreground active:scale-95 transition-all duration-200"
    >
      <RefreshCw size={14} className={`mr-2 ${isSyncing ? "animate-spin" : ""}`} />
      {isSyncing ? "Syncing..." : "Sync Data"}
    </Button>
  );
};
