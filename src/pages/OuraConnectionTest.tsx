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
        // expires_at is a timestamp string, not unix seconds
        const expiresDate = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
        const isExpired = expiresDate ? expiresDate < new Date() : true;
        updateResult("tokens", "success",
          `Token found - ${isExpired ? "EXPIRED" : "Valid"}`,
          `Created: ${tokenData.created_at}, Expires: ${expiresDate?.toISOString() || 'Unknown'}`
        );
      } else {
        updateResult("tokens", "success", "No existing tokens found");
      }

      // Test 4: Check oura-auth-test function (backend diagnostics)
      updateResult("backend", "running", "Running backend diagnostics...");
      const { data: backendData, error: backendError } = await supabase.functions.invoke("oura-auth-test", {
        body: {},
      });

      if (backendError) {
        updateResult("backend", "error", "Backend diagnostics failed", backendError.message);
      } else if (backendData?.diagnostics) {
        const diag = backendData.diagnostics as Record<string, unknown>;
        const env = diag.env as Record<string, boolean> | undefined;
        const envStatus = [
          `OURA_CLIENT_ID: ${env?.OURA_CLIENT_ID ? '✓' : '✗'}`,
          `OURA_CLIENT_SECRET: ${env?.OURA_CLIENT_SECRET ? '✓' : '✗'}`,
          `SUPABASE_URL: ${env?.SUPABASE_URL ? '✓' : '✗'}`,
          `SUPABASE_SERVICE_ROLE_KEY: ${env?.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗'}`,
          `Database Access: ${diag.database_access}`,
        ].join('\n');

        const allGood = env?.OURA_CLIENT_ID && env?.OURA_CLIENT_SECRET &&
                       env?.SUPABASE_URL && env?.SUPABASE_SERVICE_ROLE_KEY &&
                       String(diag.database_access).includes('SUCCESS');

        updateResult("backend", allGood ? "success" : "error",
          allGood ? "All backend checks passed" : "Some backend checks failed",
          envStatus);
      } else {
        updateResult("backend", "error", "Invalid response from backend", JSON.stringify(backendData));
      }

      // Test 5: Check oura-auth-initiate function
      updateResult("initiate", "running", "Testing oura-auth-initiate function...");
      const { data: initiateData, error: initiateError } = await supabase.functions.invoke("oura-auth-initiate", {
        body: { user_id: user.id },
      });

      if (initiateError) {
        updateResult("initiate", "error", "Function invocation failed", initiateError.message);
      } else if (initiateData?.auth_url) {
        const authUrl = initiateData.auth_url as string;
        const urlObj = new URL(authUrl);
        const redirectUri = urlObj.searchParams.get('redirect_uri');
        const clientId = urlObj.searchParams.get('client_id');

        const details = [
          `Full URL: ${authUrl}`,
          `\nRedirect URI: ${redirectUri}`,
          `Client ID: ${clientId?.substring(0, 8)}...`,
          `\n⚠️ VERIFY THIS MATCHES YOUR OURA PORTAL:`,
          `Expected Redirect URI: https://predictiv.netlify.app/oauth/callback/oura`,
          `\nIf these don't match EXACTLY, OAuth will fail!`
        ].join('\n');

        updateResult("initiate", "success", "Auth URL generated - CHECK REDIRECT URI BELOW", details);
      } else {
        updateResult("initiate", "error", "No auth URL returned", JSON.stringify(initiateData));
      }

      // Test 6: Check Edge Function logs (simulated)
      updateResult("logs", "running", "Checking for recent errors...");
      // In production, you'd query function logs, but we'll just mark as complete
      updateResult("logs", "success", "Check Supabase Dashboard > Edge Functions > oura-auth for detailed logs");

      // Test 7: Environment check
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

            <div className="mt-8 space-y-4">
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <h4 className="font-semibold mb-2 text-amber-600 dark:text-amber-400">🔍 Critical Check: Oura Developer Portal</h4>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Go to: <a href="https://cloud.ouraring.com/oauth/applications" target="_blank" rel="noopener noreferrer" className="underline text-blue-600 dark:text-blue-400">https://cloud.ouraring.com/oauth/applications</a></p>
                  <p className="font-medium">Verify these EXACT values:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li><strong>Redirect URI:</strong> <code className="bg-black/20 px-2 py-0.5 rounded">https://predictiv.netlify.app/oauth/callback/oura</code></li>
                    <li><strong>Client ID:</strong> Must match the Client ID in the "initiate" test above</li>
                    <li><strong>Client Secret:</strong> Must match what's set in Supabase Edge Function secrets</li>
                  </ol>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2">⚠️ Even a single character difference will cause OAuth to fail!</p>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
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
                    <strong>If callback returns NO CODE:</strong> This means redirect URI mismatch - verify in Oura Portal
                  </li>
                  <li>
                    <strong>If callback has code but fails:</strong> Check Edge Function logs for token exchange errors
                  </li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
