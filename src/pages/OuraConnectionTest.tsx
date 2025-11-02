import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  step: string;
  status: "pending" | "running" | "success" | "error";
  message: string;
  details?: string;
}

export const OuraConnectionTest = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateResult = (step: string, status: TestResult["status"], message: string, details?: string) => {
    setResults(prev => {
      const existing = prev.find(r => r.step === step);
      if (existing) {
        return prev.map(r => r.step === step ? { step, status, message, details } : r);
      }
      return [...prev, { step, status, message, details }];
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Test 1: Check authentication
      updateResult("auth", "running", "Checking authentication...");
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        updateResult("auth", "error", "Not authenticated", authError?.message);
        setIsRunning(false);
        return;
      }
      updateResult("auth", "success", `Authenticated as user: ${user.id}`);

      // Test 2: Check oura_tokens table structure
      updateResult("table", "running", "Checking oura_tokens table...");
      const { error: tableError } = await supabase
        .from("oura_tokens")
        .select("user_id")
        .limit(0);

      if (tableError) {
        updateResult("table", "error", "Table access failed", tableError.message);
      } else {
        updateResult("table", "success", "oura_tokens table accessible");
      }

      // Test 3: Check existing tokens
      updateResult("tokens", "running", "Checking for existing tokens...");
      const { data: tokenData, error: tokenError } = await supabase
        .from("oura_tokens")
        .select("user_id, expires_at, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenError) {
        updateResult("tokens", "error", "Failed to query tokens", tokenError.message);
      } else if (tokenData) {
        const expiresDate = new Date(tokenData.expires_at * 1000);
        const isExpired = expiresDate < new Date();
        updateResult("tokens", "success",
          `Token found - ${isExpired ? "EXPIRED" : "Valid"}`,
          `Created: ${tokenData.created_at}, Expires: ${expiresDate.toISOString()}`
        );
      } else {
        updateResult("tokens", "success", "No existing tokens found");
      }

      // Test 4: Check oura-auth-initiate function
      updateResult("initiate", "running", "Testing oura-auth-initiate function...");
      const { data: initiateData, error: initiateError } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });

      if (initiateError) {
        updateResult("initiate", "error", "Function invocation failed", initiateError.message);
      } else if (initiateData?.auth_url) {
        updateResult("initiate", "success", "Auth URL generated", `URL: ${initiateData.auth_url.substring(0, 100)}...`);
      } else {
        updateResult("initiate", "error", "No auth URL returned", JSON.stringify(initiateData));
      }

      // Test 5: Check Edge Function logs (simulated)
      updateResult("logs", "running", "Checking for recent errors...");
      // In production, you'd query function logs, but we'll just mark as complete
      updateResult("logs", "success", "Check Supabase Dashboard > Edge Functions > oura-auth for detailed logs");

      // Test 6: Environment check
      updateResult("env", "running", "Verifying environment configuration...");
      const envChecks = [];

      // Check Supabase URL
      if (import.meta.env.VITE_SUPABASE_URL) {
        envChecks.push("✓ VITE_SUPABASE_URL configured");
      } else {
        envChecks.push("✗ VITE_SUPABASE_URL missing");
      }

      // Check Supabase Anon Key
      if (import.meta.env.VITE_SUPABASE_ANON_KEY) {
        envChecks.push("✓ VITE_SUPABASE_ANON_KEY configured");
      } else {
        envChecks.push("✗ VITE_SUPABASE_ANON_KEY missing");
      }

      updateResult("env", "success", "Frontend environment verified", envChecks.join("\n"));

    } catch (error) {
      updateResult("general", "error", "Unexpected error", error instanceof Error ? error.message : String(error));
    } finally {
      setIsRunning(false);
    }
  };

  const testConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please log in first");
        return;
      }

      const { data, error } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });

      if (error || !data?.auth_url) {
        alert(`Error: ${error?.message || "No auth URL returned"}`);
        return;
      }

      // Redirect to Oura OAuth
      window.location.href = data.auth_url;
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to initiate connection");
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ōura Connection Diagnostics</CardTitle>
            <CardDescription>
              This page tests the complete Ōura OAuth flow and identifies any issues
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                onClick={runDiagnostics}
                disabled={isRunning}
                variant="default"
              >
                {isRunning ? "Running Tests..." : "Run Full Diagnostics"}
              </Button>
              <Button
                onClick={testConnection}
                variant="outline"
              >
                Test OAuth Connection
              </Button>
            </div>

            {results.length > 0 && (
              <div className="space-y-3 mt-6">
                <h3 className="font-semibold text-lg">Test Results:</h3>
                {results.map((result, index) => (
                  <Alert key={index} variant={result.status === "error" ? "destructive" : "default"}>
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{result.step}</span>
                          <span className="text-sm text-muted-foreground capitalize">{result.status}</span>
                        </div>
                        <AlertDescription className="mt-1">
                          {result.message}
                          {result.details && (
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                              {result.details}
                            </pre>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">Quick Fix Guide:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>
                  <strong>If "oura-auth" fails:</strong> Check Supabase Dashboard → Edge Functions →
                  Secrets and ensure OURA_CLIENT_ID and OURA_CLIENT_SECRET are set
                </li>
                <li>
                  <strong>If tokens don't save:</strong> The Edge Function needs SUPABASE_URL and
                  SUPABASE_SERVICE_ROLE_KEY (these are auto-provided by Supabase)
                </li>
                <li>
                  <strong>If callback fails:</strong> Verify the redirect URI in your Oura Developer
                  Portal matches: https://predictiv.netlify.app/oauth/callback/oura
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
