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

        if (!code) {
          console.error("❌ No authorization code found in URL");
          setStatus("error");
          setMessage("Missing Fitbit authorization code.");
          return;
        }

        console.log("🔄 Exchanging Fitbit code for tokens via Netlify function...");

        const res = await fetch("/.netlify/functions/exchange-fitbit-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await res.json();

        if (!res.ok || !data?.success) {
          console.error("❌ Fitbit token exchange failed:", data);
          setStatus("error");
          setMessage("Fitbit connection failed. Please try again.");
          return;
        }

        // ✅ Get current user
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (!user) {
          console.error("❌ No logged-in user found.");
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
          setStatus("error");
          setMessage("Connected to Fitbit, but failed to save connection.");
          return;
        }

        console.log("🎉 Fitbit connection successful!");

        // ✅ Fetch latest Fitbit data
        console.log("⏳ Fetching latest Fitbit data...");
        await supabase.functions.invoke("fetch-fitbit-data", {
          body: { access_token: data.data.access_token },
        });

        console.log("✅ Fitbit activity data synced.");

        // ✅ Success & redirect
        setStatus("success");
        setMessage("Fitbit connected and data synced! Redirecting...");
        setTimeout(() => (window.location.href = "/health"), 2500);
      } catch (err) {
        console.error("💥 Unexpected Fitbit error:", err);
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
