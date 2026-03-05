import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GoogleCalendarConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

export const GoogleCalendarConnection = ({ onConnectionChange }: GoogleCalendarConnectionProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [lastSyncInfo, setLastSyncInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkConnection();
    fetchLastSync();
  }, []);

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("google_calendar_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsConnected(true);
        setTokenInfo(data);
        onConnectionChange?.(true);
      } else {
        setIsConnected(false);
        onConnectionChange?.(false);
      }
    } catch (error) {
      console.error("Error checking Google Calendar connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLastSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("google_calendar_sync_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setLastSyncInfo(data);
    } catch (error) {
      console.error("Error fetching sync info:", error);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication Required",
          description: "Please log in to connect Google Calendar",
          variant: "destructive",
        });
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth-initiate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to initiate Google Calendar connection");
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error connecting Google Calendar:", error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect Google Calendar",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      setIsConnected(false);
      setTokenInfo(null);
      onConnectionChange?.(false);

      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
    } catch (error) {
      console.error("Error disconnecting Google Calendar:", error);
      toast({
        title: "Disconnection Failed",
        description: "Failed to disconnect Google Calendar",
        variant: "destructive",
      });
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-google-calendar-events`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ daysAhead: 7 }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to sync calendar events");
      }

      const result = await response.json();

      toast({
        title: "Sync Complete",
        description: `Successfully synced ${result.eventsSynced} events`,
      });

      await fetchLastSync();
    } catch (error) {
      console.error("Error syncing calendar:", error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync calendar events",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Google Calendar</CardTitle>
          </div>
          {isConnected ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              Not Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          {isConnected
            ? "Your Google Calendar is connected and syncing"
            : "Connect your Google Calendar to sync events with your planner"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            {tokenInfo && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connected:</span>
                  <span className="font-medium">
                    {new Date(tokenInfo.created_at).toLocaleDateString()}
                  </span>
                </div>
                {lastSyncInfo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span className="font-medium">
                      {new Date(lastSyncInfo.created_at).toLocaleDateString()} at{" "}
                      {new Date(lastSyncInfo.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {lastSyncInfo?.events_synced !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Events Synced:</span>
                    <span className="font-medium">{lastSyncInfo.events_synced}</span>
                  </div>
                )}
              </div>
            )}

            {lastSyncInfo?.status === "failed" && (
              <Alert variant="destructive">
                <AlertDescription>
                  Last sync failed: {lastSyncInfo.error_message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSyncNow}
                disabled={isSyncing}
                variant="default"
                className="flex-1"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
              <Button onClick={handleDisconnect} variant="outline">
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
            variant="default"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
