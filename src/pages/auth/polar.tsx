import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConnectionStatus = "loading" | "success" | "consent_required" | "missing_code" | "error";

export default function PolarCallback() {
  const [status, setStatus] = useState<ConnectionStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state");

      if (!code) {
        setStatus("missing_code");
        setErrorMessage("Missing authorization code");
        return;
      }

      if (!state) {
        setStatus("error");
        setErrorMessage("Missing state parameter");
        return;
      }

      try {
        const callbackUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/polar-auth-callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

        const response = await fetch(callbackUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.status === 403 && data.error === "consent_required") {
          setStatus("consent_required");
          return;
        }

        if (!response.ok || !data.success) {
          setStatus("error");
          setErrorMessage(data.error || "Failed to connect Polar device");
          return;
        }

        setStatus("success");

        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } catch (error) {
        console.error("Polar callback error:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-8 shadow-glass text-center space-y-6">
          {status === "loading" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Loader2 size={32} className="text-primary animate-spin" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Connecting Polar</h2>
                <p className="text-muted-foreground">Please wait while we connect your device...</p>
              </div>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle size={32} className="text-green-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Polar Connected!</h2>
                <p className="text-muted-foreground">Your Polar device has been successfully connected.</p>
              </div>
              <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
            </>
          )}

          {status === "consent_required" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <AlertCircle size={32} className="text-yellow-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Consent Required</h2>
                <p className="text-muted-foreground mb-4">
                  Please enable mandatory consents for Polar AccessLink at:
                </p>
                <a
                  href="https://account.polar.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  https://account.polar.com
                </a>
              </div>
              <Button onClick={() => navigate("/settings")} className="w-full">
                Back to Settings
              </Button>
            </>
          )}

          {status === "missing_code" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle size={32} className="text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Missing Authorization Code</h2>
                <p className="text-muted-foreground">
                  The authorization process was incomplete. Please try connecting again.
                </p>
              </div>
              <Button onClick={() => navigate("/settings")} className="w-full">
                Back to Settings
              </Button>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle size={32} className="text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Connection Failed</h2>
                <p className="text-muted-foreground">
                  {errorMessage || "Something went wrong. Try connecting again."}
                </p>
              </div>
              <Button onClick={() => navigate("/settings")} className="w-full">
                Back to Settings
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="opacity-60"
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M12 6v6l4 2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm">Polar</span>
          </div>
        </div>
      </div>
    </div>
  );
}
