import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function FitbitCallback() {
  const [status, setStatus] = useState("Exchanging Fitbit code...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus(`Fitbit returned an error: ${error}`);
      return;
    }

    if (!code) {
      setStatus("❌ No authorization code found in URL.");
      return;
    }

    // ✅ Send the code (and PKCE code_verifier if available) to Supabase Edge Function
    (async () => {
      try {
        const code_verifier = localStorage.getItem("fitbit_code_verifier") || undefined;
        if (code_verifier) {
          localStorage.removeItem("fitbit_code_verifier");
        }

        // Get or create authenticated user
        let userId: string | undefined;
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          userId = user.id;
        } else {
          // Create an anonymous session for Fitbit data
          const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
          if (!anonError && anonData.user) {
            userId = anonData.user.id;
            console.log("✅ Created anonymous session for Fitbit:", userId);
          }
        }

        const { data, error } = await supabase.functions.invoke('exchange-fitbit-token', {
          body: { code, code_verifier, user_id: userId },
        });

        if (!error && data) {
          console.log("✅ Fitbit token exchange success:", data);
          setStatus("✅ Fitbit connection successful!");
          
          // Trigger initial sync
          await supabase.functions.invoke('fetch-fitbit-auto', {
            body: { user_id: userId }
          });
          
          setTimeout(() => window.location.replace("/dashboard"), 1500);
        } else {
          console.error("❌ Fitbit token exchange error:", error);
          setStatus("❌ Fitbit token exchange failed. Check logs.");
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setStatus("❌ Network or server error. Try again.");
      }
    })();
  }, []);

  return (
    <div className='flex flex-col items-center justify-center h-screen text-center'>
      <h2 className='text-xl font-semibold'>{status}</h2>
      <p className='text-muted-foreground mt-4'>
        {status.includes("successful") ? "Redirecting to dashboard..." : "You can close this window once the message above says successful."}
      </p>
    </div>
  );
}
