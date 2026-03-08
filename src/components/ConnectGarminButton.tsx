import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GARMIN_AUTH_URL =
  "https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/garmin-auth";

interface ConnectGarminButtonProps {
  isConnected: boolean;
  onConnectionChange?: () => void;
  isExpired?: boolean;
}

export const ConnectGarminButton = ({ isConnected, onConnectionChange, isExpired = false }: ConnectGarminButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const connectGarmin = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to connect your wearable");
      }

      // Navigate directly to garmin-auth with userId — the edge function handles
      // PKCE generation, state storage, and redirect to Garmin OAuth in one step.
      window.location.href = `${GARMIN_AUTH_URL}?userId=${encodeURIComponent(user.id)}`;
    } catch (err) {
      console.error("[connectGarmin] Error:", err);
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to start wearable connection",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (isConnected || isExpired) {
    return (
      <Button
        onClick={connectGarmin}
        disabled={isLoading}
        size="sm"
        variant={isExpired ? "destructive" : "outline"}
        className={
          isExpired
            ? "hover:scale-105 active:scale-95 transition-all duration-200"
            : "bg-glass/30 border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200"
        }
      >
        {isLoading ? (
          <>
            <RefreshCw size={14} className="mr-2 animate-spin" />
            Reconnecting...
          </>
        ) : (
          <>
            <RefreshCw size={14} className="mr-2" />
            Reconnect
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      onClick={connectGarmin}
      disabled={isLoading}
      size="sm"
      className="bg-primary/80 hover:bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50"
    >
      {isLoading ? (
        <>
          <RefreshCw size={14} className="mr-2 animate-spin" />
          Connecting...
        </>
      ) : (
        "Connect Wearable"
      )}
    </Button>
  );
};
