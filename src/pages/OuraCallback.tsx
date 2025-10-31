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
        // Extract the code and state from URL query params
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const state = params.get("state");
        const iss = params.get("iss");

        console.log("[OuraCallback] Full URL:", window.location.href);
        console.log("[OuraCallback] Parsed params:", { code, state, iss });
        console.log("[OuraCallback] Received authorization code");
        console.log("[OuraCallback] State parameter:", state);

        if (!code) {
          throw new Error("Authorization code not found in URL");
        }

        // Get the authenticated user's ID
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          throw new Error("User not authenticated. Please log in first.");
        }

        const user_id = user.id;
        console.log("[OuraCallback] Authenticated user ID:", user_id);

        // Call the oura-auth edge function using Supabase client (adds required auth headers)
        const { data: exchangeData, error: exchangeError } = await supabase.functions.invoke("oura-auth", {
          body: { code, state, user_id },
        });

        if (exchangeError) {
          throw new Error(exchangeError.message || "Failed to authenticate with Ōura");
        }

        console.log("[OuraCallback] Edge function returned success, verifying database...");

        // Verify tokens were actually saved in the database
        const { data: verifyData, error: verifyError } = await supabase
          .from("oura_tokens")
          .select("user_id")
          .eq("user_id", user_id)
          .maybeSingle();

        if (verifyError || !verifyData) {
          throw new Error(
            "Tokens were not saved to database. Please check Edge Function secrets (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) in Supabase Dashboard."
          );
        }

        console.log("[OuraCallback] Successfully authenticated with Ōura and verified DB write");
        setStatus("success");

        toast({
          title: "Ōura Ring Connected",
          description: "Your Ōura Ring has been successfully connected",
        });

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          window.location.href = "/dashboard";
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
