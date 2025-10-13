import { useEffect, useState } from "react";

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

    // ✅ Send the code to your Netlify function
    (async () => {
      try {
        const response = await fetch("/.netlify/functions/fetch-fitbit-auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        const data = await response.json();

        if (response.ok) {
          console.log("✅ Fitbit token exchange success:", data);
          setStatus("✅ Fitbit connection successful!");
        } else {
          console.error("❌ Fitbit token exchange error:", data);
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
      <p className='text-gray-500 mt-4'>
        You can close this window once the message above says successful.
      </p>
    </div>
  );
}
