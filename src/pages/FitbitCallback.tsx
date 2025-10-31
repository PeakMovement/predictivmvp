import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const FitbitCallback = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Fitbit...");
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");

        if (error) {
          setStatus("error");
          setMessage(`Authorization failed: ${error}`);
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        if (!code) {
          setStatus("error");
          setMessage("No authorization code received");
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        const codeVerifier = sessionStorage.getItem("wearable_code_verifier");
        const userId = state || sessionStorage.getItem("wearable_user_id");

        if (!codeVerifier || !userId) {
          setStatus("error");
          setMessage("Missing authorization data. Please try connecting again.");
          setTimeout(() => navigate("/settings"), 3000);
          return;
        }

        sessionStorage.removeItem("wearable_code_verifier");
        sessionStorage.removeItem("wearable_user_id");

        setMessage("Exchanging authorization code for tokens...");

        const { data, error: callbackError } = await supabase.functions.invoke(
          "fitbit-callback-handler",
          {
            body: {
              code,
              code_verifier: codeVerifier,
              user_id: userId,
            },
          }
        );

        if (callbackError || !data?.success) {
          throw new Error(data?.error || callbackError?.message || "Failed to connect Fitbit");
        }

        setStatus("success");
        setMessage("Fitbit connected successfully! Fetching your health data...");

        await supabase.functions.invoke("fitbit-fetch-data", {
          body: { user_id: userId },
        });

        setTimeout(() => navigate("/settings"), 2000);
      } catch (err) {
        console.error("Fitbit callback error:", err);
        setStatus("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "Failed to connect Fitbit. Please try again."
        );
        setTimeout(() => navigate("/settings"), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col items-center justify-center",
        "bg-gradient-to-br from-blue-500/10 via-teal-500/10 to-cyan-500/10",
        "p-6"
      )}
    >
      <div
        className={cn(
          "max-w-md w-full space-y-8 text-center",
          "bg-glass backdrop-blur-xl border-glass-border",
          "rounded-2xl p-8 shadow-glass",
          "animate-fade-in"
        )}
      >
        <div className="flex flex-col items-center gap-6">
          {status === "loading" && (
            <>
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Connecting Fitbit
                </h1>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Success!
                </h1>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="h-16 w-16 text-destructive" />
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Connection Failed
                </h1>
                <p className="text-muted-foreground">{message}</p>
              </div>
            </>
          )}

          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-1000",
                status === "loading" && "w-2/3 bg-primary animate-pulse",
                status === "success" && "w-full bg-green-500",
                status === "error" && "w-full bg-destructive"
              )}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {status === "loading" && "Please wait..."}
            {status === "success" && "Redirecting to settings..."}
            {status === "error" && "Redirecting back..."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default FitbitCallback;
