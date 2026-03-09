import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const OuraCallback = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleOuraCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const error = params.get("error");
        const errorDescription = params.get("error_description");


        if (error) {
          throw new Error(
            errorDescription || `Authorization failed: ${error}`
          );
        }

        if (!code) {
          const troubleshootingInfo = `
URL: ${window.location.href}
Has query params: ${window.location.search ? 'Yes' : 'No'}
Params found: ${Array.from(params.keys()).join(', ') || 'None'}

Common causes:
1. Redirect URI mismatch in Oura Developer Portal
2. User cancelled the authorization
3. OAuth flow timed out

Expected redirect URI: https://predictiv.netlify.app/oauth/callback/oura`;

          console.error("[OuraCallback] Missing auth code. Details:", troubleshootingInfo);

          throw new Error(
            "Authorization code not found. The OAuth flow may have been cancelled or interrupted."
          );
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("User not authenticated. Please log in and try connecting your Oura Ring again.");
        }

        const user_id = user.id;

        // Call the oura-auth edge function using Supabase client (adds required auth headers)
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke("oura-auth", {
          body: { code, user_id },
        });


        if (exchangeError) {
          console.error("[OuraCallback] Edge function error:", {
            name: exchangeError.name,
            message: exchangeError.message,
            context: exchangeError.context,
            details: exchangeError
          });

          let errorMsg = exchangeError.message || "Failed to authenticate with Oura";

          if (exchangeError.context?.body) {
            try {
              const errorBody = typeof exchangeError.context.body === 'string'
                ? JSON.parse(exchangeError.context.body)
                : exchangeError.context.body;

              if (errorBody.error) {
                errorMsg = errorBody.error;
              }

              console.error("[OuraCallback] Parsed error body:", errorBody);
            } catch (e) {
              console.error("[OuraCallback] Could not parse error body:", e);
            }
          }

          if (errorMsg.includes("redirect_uri") || errorMsg.includes("Redirect URI")) {
            throw new Error(
              "OAuth redirect URI mismatch. Verify your Oura Developer Portal has: https://predictiv.netlify.app/oauth/callback/oura"
            );
          } else if (errorMsg.includes("invalid_grant") || errorMsg.includes("expired")) {
            throw new Error(
              "Authorization code expired or invalid. Please try connecting again."
            );
          } else if (errorMsg.includes("invalid_client") || errorMsg.includes("credentials")) {
            throw new Error(
              "Invalid Oura API credentials. Please verify OURA_CLIENT_ID and OURA_CLIENT_SECRET are correctly configured."
            );
          } else if (errorMsg.includes("OURA_CLIENT")) {
            throw new Error(
              "Oura API credentials not configured. Please contact support."
            );
          }

          throw new Error(errorMsg);
        }

        if (!exchangeData || !exchangeData.success) {
          console.error("[OuraCallback] Unexpected response from edge function:", exchangeData);
          throw new Error("Token exchange completed but did not return success status");
        }


        await new Promise(resolve => setTimeout(resolve, 1500));


        const { data: verifyData, error: verifyError } = await supabase
          .from("oura_tokens")
          .select("user_id, access_token, expires_at")
          .eq("user_id", user_id)
          .maybeSingle();

        if (verifyError) {
          console.error("[OuraCallback] Verification error:", verifyError);
          throw new Error(`Token verification failed: ${verifyError.message}`);
        }

        if (!verifyData || !verifyData.access_token) {
          throw new Error(
            "Tokens were not properly saved. This may be a temporary issue - please try reconnecting your Oura Ring."
          );
        }


        // Trigger initial data fetch
        try {
          const { data: fetchData, error: fetchError } = await supabase.functions.invoke("fetch-oura-data", {
            body: { user_id, start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
          });

          if (fetchError) {
            console.error("[OuraCallback] Initial data fetch failed:", fetchError);
          } else {
          }
        } catch (fetchErr) {
          console.error("[OuraCallback] Error triggering initial data fetch:", fetchErr);
        }

        setStatus("success");

        toast({
          title: "Ōura Ring Connected",
          description: "Your Ōura Ring has been successfully connected. Fetching your health data...",
        });

        // Redirect to root path (which will load dashboard by default) after a short delay
        setTimeout(() => {
          window.location.href = "/";
        }, 1500);
      } catch (error) {
        console.error("[OuraCallback] Error:", error);
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "An unknown error occurred"
        );

        toast({
          title: "Connection Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to connect your Ōura Ring",
          variant: "destructive",
        });
      }
    };

    handleOuraCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 shadow-glass text-center space-y-6">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Connecting your Ōura account...
              </h2>
              <p className="text-muted-foreground">
                Please wait while we complete the connection
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Connection Successful!
              </h2>
              <p className="text-muted-foreground">
                Your Ōura Ring is now connected. Redirecting to dashboard...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-rose-500 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Connection Failed
              </h2>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              {(errorMessage.includes("Authorization code not found") ||
                errorMessage.includes("redirect_uri") ||
                errorMessage.includes("Redirect URI") ||
                errorMessage.includes("credentials") ||
                errorMessage.includes("Edge Function")) && (
                <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-left">
                  <p className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                    Troubleshooting Steps:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Open browser console (F12) to see detailed error logs</li>
                    <li>Verify Oura Developer Portal redirect URI is exactly:<br/>
                    <code className="text-xs bg-black/20 px-1 py-0.5 rounded mt-1 inline-block">
                      https://predictiv.netlify.app/oauth/callback/oura
                    </code>
                    </li>
                    <li>Check OURA_CLIENT_ID and OURA_CLIENT_SECRET are set in Supabase Edge Functions</li>
                    <li>Verify Client ID matches between Oura Portal and Supabase secrets</li>
                    <li>Try connecting again and approve all permissions</li>
                  </ol>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                className="flex-1 bg-glass/30 border-glass-border hover:bg-glass-highlight"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary/80 hover:bg-primary text-primary-foreground"
              >
                Try Again
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
