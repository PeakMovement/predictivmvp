import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function FitbitCallback() {
  const [status, setStatus] = useState("Exchanging Fitbit code...");
  const navigate = useNavigate();

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

    // ✅ Send the code (and PKCE code_verifier if available) to your Netlify function
    (async () => {
      try {
        const code_verifier = localStorage.getItem("fitbit_code_verifier") || undefined;
        // Clear the code_verifier after using it
        if (code_verifier) {
          localStorage.removeItem("fitbit_code_verifier");
        }
        const response = await fetch("/.netlify/functions/fitbit-token-exchange", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, code_verifier }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("✅ Fitbit token exchange success:", data);
          setStatus("✅ Fitbit connection successful!");
          setTimeout(() => navigate("/dashboard"), 1500);
        } else {
          console.error("❌ Fitbit token exchange error:", data);
          setStatus("❌ Fitbit token exchange failed. Check logs.");
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setStatus("❌ Network or server error. Try again.");
      }
    })();
  }, [navigate]);

  return (
    <div className='flex flex-col items-center justify-center h-screen text-center'>
      <h2 className='text-xl font-semibold'>{status}</h2>
      <p className='text-muted-foreground mt-4'>
        {status.includes("successful") ? "Redirecting to dashboard..." : "You can close this window once the message above says successful."}
      </p>
    </div>
  );
}
