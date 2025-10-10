import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const FitbitAuth = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Fitbit...");

  useEffect(() => {
    const handleFitbitCallback = async () => {
      try {
        // ✅ Get the "code" Fitbit sends in the redirect URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
          setStatus("error");
          setMessage("No authorization code found. Please try connecting again.");
          return;
        }

        // ✅ Call the Supabase Edge Function to exchange the code for tokens
        const { data, error } = await supabase.functions.invoke("exchange-fitbit-token", {
          body: { code },
        });

        if (error) {
          console.error("Fitbit token exchange error:", error);
          setStatus("error");
          setMessage("Failed to connect to Fitbit. Please try again.");
          return;
        }

        console.log("✅ Fitbit token exchange success:", data);

        setStatus("success");
        setMessage("Fitbit connected successfully!");
      } catch (err) {
        console.error("❌ Unexpected error:", err);
        setStatus("error");
        setMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleFitbitCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-glass backdrop-blur-xl border-glass-border shadow-2xl text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
            <p>{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-green-500 font-bold">{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{message}</p>
          </>
        )}
      </Card>
    </div>
  );
};

export default FitbitAuth;
