import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DiagnosticResult {
  step: string;
  status: "success" | "error" | "warning" | "pending";
  message: string;
  data?: any;
}

export const OuraDataDiagnostics = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticResult) => {
    setResults((prev) => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      addResult({
        step: "Authentication",
        status: "pending",
        message: "Checking user authentication...",
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        addResult({
          step: "Authentication",
          status: "error",
          message: "Not authenticated. Please log in.",
        });
        setIsRunning(false);
        return;
      }

      addResult({
        step: "Authentication",
        status: "success",
        message: `Logged in as: ${user.email}`,
        data: { user_id: user.id },
      });

      addResult({
        step: "Oura Tokens",
        status: "pending",
        message: "Checking Oura OAuth tokens...",
      });

      const { data: tokenData, error: tokenError } = await supabase
        .from("oura_tokens")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokenError) {
        addResult({
          step: "Oura Tokens",
          status: "error",
          message: `Database error: ${tokenError.message}`,
        });
      } else if (!tokenData) {
        addResult({
          step: "Oura Tokens",
          status: "error",
          message: "❌ No Oura token found. You need to connect your Oura Ring in Settings.",
        });
      } else {
        const isExpired = new Date(tokenData.expires_at) <= new Date();
        addResult({
          step: "Oura Tokens",
          status: isExpired ? "warning" : "success",
          message: isExpired
            ? "⚠️ Token expired. Reconnect your Oura Ring in Settings."
            : "✅ Valid token found",
          data: {
            expires_at: tokenData.expires_at,
            has_access_token: !!tokenData.access_token,
            has_refresh_token: !!tokenData.refresh_token,
          },
        });
      }

      addResult({
        step: "Wearable Sessions",
        status: "pending",
        message: "Checking for Oura data in database...",
      });

      const { data: sessions, error: sessionsError } = await supabase
        .from("wearable_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("source", "oura")
        .order("date", { ascending: false })
        .limit(10);

      if (sessionsError) {
        addResult({
          step: "Wearable Sessions",
          status: "error",
          message: `Database error: ${sessionsError.message}`,
        });
      } else if (!sessions || sessions.length === 0) {
        addResult({
          step: "Wearable Sessions",
          status: "warning",
          message: "⚠️ No Oura data found in database. Click 'Update Now' to sync.",
        });
      } else {
        addResult({
          step: "Wearable Sessions",
          status: "success",
          message: `✅ Found ${sessions.length} day(s) of Oura data`,
          data: {
            latest_date: sessions[0].date,
            readiness_score: sessions[0].readiness_score,
            sleep_score: sessions[0].sleep_score,
            activity_score: sessions[0].activity_score,
            resting_hr: sessions[0].resting_hr,
            hrv: sessions[0].hrv,
            total_steps: sessions[0].total_steps,
          },
        });
      }

      addResult({
        step: "Oura Logs",
        status: "pending",
        message: "Checking sync history...",
      });

      const { data: logs, error: logsError } = await supabase
        .from("oura_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (logsError) {
        addResult({
          step: "Oura Logs",
          status: "error",
          message: `Database error: ${logsError.message}`,
        });
      } else if (!logs || logs.length === 0) {
        addResult({
          step: "Oura Logs",
          status: "warning",
          message: "No sync attempts recorded yet. Try clicking 'Update Now'.",
        });
      } else {
        const lastLog = logs[0];
        const hasErrors = logs.some((log) => log.status === "failed");

        addResult({
          step: "Oura Logs",
          status: hasErrors ? "warning" : "success",
          message: hasErrors
            ? `⚠️ ${logs.filter((l) => l.status === "failed").length} failed sync(s) found`
            : `✅ ${logs.length} sync attempt(s) recorded`,
          data: {
            last_sync: lastLog.created_at,
            last_status: lastLog.status,
            last_error: lastLog.error_message,
            entries_synced: lastLog.entries_synced,
          },
        });
      }

      addResult({
        step: "Data Fields Check",
        status: "pending",
        message: "Checking which data fields are populated...",
      });

      if (sessions && sessions.length > 0) {
        const latest = sessions[0];
        const populatedFields = [];
        const missingFields = [];

        const fieldsToCheck = [
          "readiness_score",
          "sleep_score",
          "activity_score",
          "resting_hr",
          "hrv",
          "total_steps",
          "active_calories",
          "total_sleep_duration",
          "deep_sleep_duration",
          "rem_sleep_duration",
          "light_sleep_duration",
        ];

        fieldsToCheck.forEach((field) => {
          if (latest[field] !== null && latest[field] !== undefined) {
            populatedFields.push(field);
          } else {
            missingFields.push(field);
          }
        });

        addResult({
          step: "Data Fields Check",
          status: populatedFields.length > 0 ? "success" : "warning",
          message: `✅ ${populatedFields.length}/${fieldsToCheck.length} fields populated`,
          data: {
            populated: populatedFields,
            missing: missingFields,
          },
        });
      }
    } catch (error) {
      addResult({
        step: "Error",
        status: "error",
        message: `Unexpected error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: DiagnosticResult["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case "pending":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult["status"]) => {
    const variants: Record<DiagnosticResult["status"], string> = {
      success: "bg-green-500/20 text-green-500",
      error: "bg-red-500/20 text-red-500",
      warning: "bg-yellow-500/20 text-yellow-500",
      pending: "bg-blue-500/20 text-blue-500",
    };

    return (
      <Badge className={variants[status]} variant="outline">
        {status}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Oura Data Diagnostics</CardTitle>
        <CardDescription>
          Test your Oura Ring connection and data flow from API to UI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Diagnostics
            </>
          )}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3 mt-6">
            {results.map((result, index) => (
              <Alert key={index} className="border-l-4" style={{
                borderLeftColor:
                  result.status === "success"
                    ? "#22c55e"
                    : result.status === "error"
                    ? "#ef4444"
                    : result.status === "warning"
                    ? "#eab308"
                    : "#3b82f6",
              }}>
                <div className="flex items-start gap-3">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTitle className="mb-0">{result.step}</AlertTitle>
                      {getStatusBadge(result.status)}
                    </div>
                    <AlertDescription className="mt-2">
                      {result.message}
                    </AlertDescription>
                    {result.data && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                          View Details
                        </summary>
                        <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {!isRunning && results.length > 0 && (
          <Alert className="mt-6">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Next Steps</AlertTitle>
            <AlertDescription>
              {results.some((r) => r.step === "Oura Tokens" && r.status === "error") ? (
                <p>
                  ❌ <strong>Action Required:</strong> Go to Settings → Connected Devices → Click
                  "Connect Oura Ring" to complete OAuth authentication.
                </p>
              ) : results.some(
                  (r) => r.step === "Wearable Sessions" && r.status === "warning"
                ) ? (
                <p>
                  ⚠️ <strong>Action Required:</strong> Click "Update Now" button in Settings or on
                  the Health page to sync your Oura data.
                </p>
              ) : (
                <p>
                  ✅ <strong>Everything looks good!</strong> Your Oura data should be displaying on
                  the Health page.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
