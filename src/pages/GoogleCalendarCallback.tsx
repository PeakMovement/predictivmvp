import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const GoogleCalendarCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");
      const error = params.get("error");

      if (error) {
        setStatus("error");
        setMessage(`Authorization failed: ${error}`);
        return;
      }

      if (!code || !state) {
        setStatus("error");
        setMessage("Missing authorization code or state");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("error");
        setMessage("Please log in to complete the connection");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-auth-callback?code=${code}&state=${state}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to complete authorization");
      }

      const result = await response.json();

      if (result.success) {
        setStatus("success");
        setMessage("Google Calendar connected successfully!");

        setTimeout(() => {
          navigate("/settings");
        }, 2000);
      } else {
        throw new Error(result.error || "Unknown error occurred");
      }
    } catch (error) {
      console.error("Error in callback:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to connect Google Calendar");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {status === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {status === "error" && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle className="text-center">
            {status === "loading" && "Connecting..."}
            {status === "success" && "Success!"}
            {status === "error" && "Connection Failed"}
          </CardTitle>
          <CardDescription className="text-center">
            {message || "Processing your Google Calendar authorization..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "error" && (
            <div className="space-y-3">
              <Button
                onClick={() => navigate("/settings")}
                className="w-full"
                variant="default"
              >
                Return to Settings
              </Button>
              <Button
                onClick={handleCallback}
                className="w-full"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          )}
          {status === "success" && (
            <div className="text-center text-sm text-muted-foreground">
              Redirecting to settings...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
