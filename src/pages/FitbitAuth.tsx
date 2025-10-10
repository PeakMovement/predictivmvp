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
        // ✅ Extract the authorization code from the URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");

        if (!code) {
          setStatus("error");
          setMessage("No authorization code found. Please try again.");
          return;
        }

        // ✅ Call your Supabase Edge Function directly
        const response = await fetch("https://ixtwbkikyuexskdgfpfq.supabase.co/functions/v1/exchange-fitbit-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (!response.ok || !data) {
          console.error("Fitbit exchange error:", data);
          setStatus("error");
          setMessage("Failed to connect to Fitbit. Please try again.");
          return;
        }

        // ✅ Update user in Supabase
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData?.user) {
          setStatus("error");
          setMessage("No logged-in user found.");
          return;
        }

        const user = userData.user;
        const { error: updateError } = await supabase
          .from("users")
          .update({
            fitbit_connected: true,
            fitbit_user_id: data.user_id || null,
            connected_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (updateError) {
          console.error("Supabase update error:", updateError);
          setStatus("error");
          setMessage("Connected to Fitbit, but failed to save connection.");
          return;
        }

        setStatus("success");
        setMessage("✅ Fitbit connected successfully! Redirecting...");
        setTimeout(() => (window.location.href = "/health"), 2500);
      } catch (err) {
        console.error("Unexpected Fitbit error:", err);
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
