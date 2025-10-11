import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function FitbitAuth() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Connecting to Fitbit...");

  useEffect(() => {
    const connectFitbit = async () => {
      try {
        // Extract authorization code from the redirect URL
        const params = new URLSearchParams(window.location.search);
        let code = params.get("code");
        if (!code && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
          code = hashParams.get("code");
        }

        console.log("🔄 Exchanging Fitbit code for tokens...");

        const { data, error } = await supabase.functions.invoke("exchange-fitbit-token", {
          body: { code },
          headers: { "Content-Type": "application/json" },
        });

        // Check for network errors first
        if (error) {
          console.error("❌ Network error calling edge function:", error);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setStatus("error");
          setMessage("Fitbit connection failed. Please try again.");
          return;
        }

        // Check the success field from the edge function response
        if (!data?.success) {
          console.error("❌ Fitbit token exchange failed:", data);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setStatus("error");
          setMessage("Fitbit connection failed. Please try again.");
          return;
        }

        // ✅ Update the user profile
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) {
          console.error("❌ No logged-in user found.");
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setStatus("error");
          setMessage("No logged-in user found.");
          return;
        }

        console.log("✅ Fitbit tokens received. Updating user record...");

        const { error: updateError } = await supabase
          .from("users")
          .update({
            fitbit_connected: true,
            fitbit_user_id: data.data.user_id,
            connected_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("⚠️ Error updating user table:", updateError);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setStatus("error");
          setMessage("Connected to Fitbit, but failed to save connection.");
          return;
        }

        console.log("🎉 Fitbit connection successful!");
        setStatus("success");
        setMessage("Fitbit connected successfully! Redirecting...");
        setTimeout(() => (window.location.href = "/health"), 2500);
      } catch (err) {
        console.error("💥 Unexpected Fitbit error:", err);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setStatus("error");
        setMessage("Unexpected error. Please try again.");
      }
    };

    connectFitbit();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/10 p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-lg">
        {status === "loading" && (
          <>
            <Loader2 className="animate-spin w-16 h-16 text-primary mx-auto" />
            <p>{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <p>{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <p>{message}</p>
            <Button onClick={() => (window.location.href = "/")}>Try Again</Button>
          </>
        )}
      </Card>
    </div>
  );
}
