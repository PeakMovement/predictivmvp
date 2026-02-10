import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ConnectGarminButtonProps {
  isConnected: boolean;
  onConnectionChange?: () => void;
}

export const ConnectGarminButton = ({ isConnected, onConnectionChange }: ConnectGarminButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const connectGarmin = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("You must be logged in to connect your Garmin device");
      }

      const { data, error } = await supabase.functions.invoke("garmin-auth-initiate");

      if (error || !data?.auth_url) {
        throw new Error(data?.error || "Failed to initiate Garmin connection");
      }

      window.location.href = data.auth_url;
    } catch (err) {
      console.error("[connectGarmin] Error:", err);
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to start Garmin connection",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  if (isConnected) {
    return (
      <Button
        onClick={onConnectionChange}
        size="sm"
        variant="outline"
        className="bg-glass/30 border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <RefreshCw size={14} className="mr-2" />
        Reconnect
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
        "Connect Garmin"
      )}
    </Button>
  );
};
