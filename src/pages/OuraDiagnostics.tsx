import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const OuraDiagnostics = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [tokenStatus, setTokenStatus] = useState<any>(null);

  useEffect(() => {
    checkTokenStatus();
  }, []);

  const checkTokenStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("oura_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking token:", error);
        setTokenStatus({ exists: false, error: error.message });
      } else if (data) {
        setTokenStatus({
          exists: true,
          created_at: data.created_at,
          updated_at: data.updated_at,
          expires_at: data.expires_at,
          expiresInDays: Math.floor((data.expires_at * 1000 - Date.now()) / (1000 * 60 * 60 * 24)),
        });
      } else {
        setTokenStatus({ exists: false });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setDiagnostics(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Test the oura-auth-initiate endpoint
      const { data: initData, error: initError } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });

      if (initError) {
        throw new Error(`Init endpoint error: ${initError.message}`);
      }

      setDiagnostics({
        success: true,
        initEndpoint: initData ? "✓ Working" : "✗ Failed",
        authUrl: initData?.auth_url ? "✓ Generated" : "✗ Not generated",
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Diagnostics Complete",
        description: "Oura authentication endpoints are working correctly",
      });
    } catch (error) {
      console.error("Diagnostic error:", error);
      setDiagnostics({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });

      toast({
        title: "Diagnostics Failed",
        description: error instanceof Error ? error.message : "Failed to run diagnostics",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const connectOura = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to connect your Ōura Ring");
      }

      const { data, error } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });

      if (error || !data?.auth_url) {
        throw new Error(data?.error || "Failed to build Oura auth URL");
      }

      window.location.href = data.auth_url;
    } catch (err) {
      console.error("[connectOura] Error:", err);
      toast({
        title: "Connection Failed",
        description: err instanceof Error ? err.message : "Failed to start Oura connection",
        variant: "destructive",
      });
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col items-center justify-center",
      "bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10",
      "p-6"
    )}>
      <div className={cn(
        "max-w-2xl w-full space-y-6",
        "bg-glass backdrop-blur-xl border-glass-border",
        "rounded-2xl p-8 shadow-glass",
        "animate-fade-in"
      )}>
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-white"></div>
            </div>
          </div>

          <h1 className={cn(
            "text-4xl font-bold tracking-tight",
            "bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400",
            "bg-clip-text text-transparent",
            "drop-shadow-lg"
          )}>
            Ōura Ring Diagnostics
          </h1>

          <p className="text-muted-foreground text-lg">
            Test your Ōura Ring connection and view token status
          </p>
        </div>

        {/* Token Status */}
        <div className={cn(
          "p-6 rounded-lg space-y-3",
          tokenStatus?.exists
            ? "bg-green-500/20 border border-green-500/30"
            : "bg-yellow-500/20 border border-yellow-500/30"
        )}>
          <div className="flex items-center gap-2 font-semibold">
            {tokenStatus?.exists ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <p className="text-green-400">Ōura Token Found</p>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <p className="text-yellow-400">No Ōura Token</p>
              </>
            )}
          </div>

          {tokenStatus?.exists && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-white">{new Date(tokenStatus.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expires in:</span>
                <span className="text-white">{tokenStatus.expiresInDays} days</span>
              </div>
            </div>
          )}

          {!tokenStatus?.exists && (
            <p className="text-sm text-muted-foreground">
              Connect your Ōura Ring below to start syncing data
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={testConnection}
            disabled={isLoading}
            size="lg"
            variant="outline"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Running diagnostics...
              </>
            ) : (
              <>
                <Database className="mr-2 h-5 w-5" />
                Test Connection
              </>
            )}
          </Button>

          <Button
            onClick={connectOura}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90"
          >
            <RefreshCw className="mr-2 h-5 w-5" />
            {tokenStatus?.exists ? "Reconnect" : "Connect"} Ōura Ring
          </Button>
        </div>

        {/* Diagnostic Results */}
        {diagnostics && (
          <div className={cn(
            "p-6 rounded-lg space-y-3",
            diagnostics.success
              ? "bg-green-500/20 border border-green-500/30"
              : "bg-red-500/20 border border-red-500/30",
            "animate-fade-in"
          )}>
            <div className="flex items-center gap-2 font-semibold">
              {diagnostics.success ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <p className="text-green-400">Diagnostics Passed</p>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="text-red-400">Diagnostics Failed</p>
                </>
              )}
            </div>

            <div className="space-y-2 text-sm">
              {diagnostics.success ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Init Endpoint:</span>
                    <span className="text-white">{diagnostics.initEndpoint}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auth URL:</span>
                    <span className="text-white">{diagnostics.authUrl}</span>
                  </div>
                </>
              ) : (
                <div className="text-red-300">
                  <p className="font-semibold">Error:</p>
                  <p className="font-mono text-xs mt-1 bg-black/20 p-2 rounded">
                    {diagnostics.error}
                  </p>
                </div>
              )}

              <p className="text-xs text-muted-foreground pt-2">
                Tested at {new Date(diagnostics.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        <div className="pt-4 text-sm text-muted-foreground space-y-2 text-center">
          <p>💡 This page helps diagnose Ōura Ring connection issues</p>
          <p>Your data automatically syncs hourly once connected</p>
        </div>
      </div>
    </div>
  );
};

export default OuraDiagnostics;
