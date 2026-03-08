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
  /** Pre-resolved Supabase userId — passed from parent to keep onClick synchronous. */
  userId?: string;
}

export const ConnectGarminButton = ({
  isConnected,
  onConnectionChange,
  isExpired = false,
  userId,
}: ConnectGarminButtonProps) => {
  const { toast } = useToast();

  // Synchronous handler — no await so the browser treats this as a direct
  // user gesture. window.top escapes Lovable/iframe preview contexts where
  // window.location.href would be silently blocked by X-Frame-Options.
  const connectGarmin = () => {
    if (!userId) {
      // userId not yet resolved — fall back to async fetch then navigate
      supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (error || !user) {
          toast({
            title: "Connection Failed",
            description: "You must be logged in to connect your wearable",
            variant: "destructive",
          });
          return;
        }
        const url = `${GARMIN_AUTH_URL}?userId=${encodeURIComponent(user.id)}`;
        navigateTo(url);
      });
      return;
    }
    const url = `${GARMIN_AUTH_URL}?userId=${encodeURIComponent(userId)}`;
    navigateTo(url);
  };

  if (isConnected || isExpired) {
    return (
      <Button
        onClick={connectGarmin}
        size="sm"
        variant={isExpired ? "destructive" : "outline"}
        className={
          isExpired
            ? "hover:scale-105 active:scale-95 transition-all duration-200"
            : "bg-glass/30 border-glass-border hover:bg-glass-highlight hover:scale-105 active:scale-95 transition-all duration-200"
        }
      >
        <RefreshCw size={14} className="mr-2" />
        Reconnect
      </Button>
    );
  }

  return (
    <Button
      onClick={connectGarmin}
      size="sm"
      className="bg-primary/80 hover:bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all duration-200"
    >
      Connect Wearable
    </Button>
  );
};

function navigateTo(url: string) {
  // Use window.top to escape iframe contexts (Lovable preview, embedded views).
  // In a normal browser tab window.top === window, so behaviour is identical.
  try {
    if (window.top && window.top !== window) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  } catch {
    // Cross-origin iframe — fall back to same-frame navigation
    window.location.href = url;
  }
}
