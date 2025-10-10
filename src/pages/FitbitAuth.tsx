import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const FitbitAuth = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Fitbit...");

  useEffect(() => {
    const handleFitbitCallback = async () => {
      try {
        // Get the code from URL parameters
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
          setStatus("error");
          setMessage("No authorization code found. Please try connecting again.");
          return;
        }

        // Call the Supabase edge function to exchange the code for tokens
        const { data, error } = await supabase.functions.invoke("exchange-fitbit-token", {
          body: { code }
        });

        if (error) {
          console.error("Fitbit token exchange error:", error);
          setStatus("error");
          setMessage("Failed to connect to Fitbit. Please try again.");
          return;
        }

        // Update user profile with Fitbit tokens
        const { error: updateError } = await supabase
          .from("Users")
          .update({
            wearables_connected: {
              fitbit: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user_id: data.user_id,
                connected_at: new Date().toISOString()
              }
            }
          })
          .eq("id", (await supabase.auth.getUser()).data.user?.id);

        if (updateError) {
          console.error("Error updating user profile:", updateError);
          setStatus("error");
          setMessage("Connected to Fitbit, but failed to save connection. Please try again.");
          return;
        }

        setStatus("success");
        setMessage("Fitbit Connected Successfully!");

        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);

      } catch (error) {
        console.error("Fitbit connection error:", error);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleFitbitCallback();
  }, []);

  const handleRetry = () => {
    setStatus("loading");
    setMessage("Connecting to Fitbit...");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-glass backdrop-blur-xl border-glass-border shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-6">
          {status === "loading" && (
            <>
              <Loader2 className="w-16 h-16 text-primary animate-spin" />
              <div>
                <h2 className="text-2xl font-bold mb-2">Connecting to Fitbit</h2>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="w-16 h-16 text-green-500" />
              <div>
                <h2 className="text-2xl font-bold mb-2 text-green-500">Success!</h2>
                <p className="text-muted-foreground">{message}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Redirecting to dashboard...
                </p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-destructive" />
              <div>
                <h2 className="text-2xl font-bold mb-2 text-destructive">Connection Failed</h2>
                <p className="text-muted-foreground mb-4">{message}</p>
                <Button 
                  onClick={handleRetry}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Try Again
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => window.location.href = "/"}
                  className="w-full mt-2"
                >
                  Return to Dashboard
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
