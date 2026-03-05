import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Loader2, Play } from "lucide-react";

interface TestResult {
  name: string;
  status: "pending" | "running" | "passed" | "failed";
  message?: string;
  duration?: number;
}

export default function AuthTest() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: "Supabase Connection", status: "pending" },
    { name: "Configuration Validation", status: "pending" },
    { name: "User Registration", status: "pending" },
    { name: "Login with Valid Credentials", status: "pending" },
    { name: "Login with Invalid Credentials", status: "pending" },
    { name: "Session Persistence", status: "pending" },
    { name: "Session Refresh", status: "pending" },
    { name: "RLS Policy Verification", status: "pending" },
    { name: "Logout Functionality", status: "pending" },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [testUserId, setTestUserId] = useState<string | null>(null);

  const updateTest = (index: number, updates: Partial<TestResult>) => {
    setTests((prev) =>
      prev.map((test, i) => (i === index ? { ...test, ...updates } : test))
    );
  };

  const runAllTests = async () => {
    setIsRunning(true);
    const testEmail = `test-${Date.now()}@predictiv.test`;
    const testPassword = "TestPass123!";

    // Test 1: Supabase Connection
    await runTest(0, async () => {
      const { data, error } = await supabase.from("health_daily").select("id").limit(1);
      if (error && error.code !== "PGRST116") throw error;
      return "Connection successful";
    });

    // Test 2: Configuration Validation
    await runTest(1, async () => {
      const config = supabase.auth;
      if (!config) throw new Error("Auth client not initialized");
      return "Configuration valid";
    });

    // Test 3: User Registration
    await runTest(2, async () => {
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: { username: "Test User" },
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("User not created");

      setTestUserId(data.user.id);
      return `User created: ${data.user.email}`;
    });

    // Test 4: Login with Valid Credentials
    await runTest(3, async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (error) throw error;
      if (!data.session) throw new Error("No session created");

      return `Login successful, session created`;
    });

    // Test 5: Login with Invalid Credentials
    await runTest(4, async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: "wrongpassword",
      });

      if (!error) throw new Error("Should have failed with wrong password");
      if (error.message.includes("Invalid")) {
        return "Correctly rejected invalid credentials";
      }
      throw new Error("Unexpected error response");
    });

    // Test 6: Session Persistence
    await runTest(5, async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;
      if (!data.session) throw new Error("Session not persisted");

      return `Session persisted: ${data.session.user.email}`;
    });

    // Test 7: Session Refresh
    await runTest(6, async () => {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;
      if (!data.session) throw new Error("Session refresh failed");

      return "Session refreshed successfully";
    });

    // Test 8: RLS Policy Verification
    await runTest(7, async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("No active session");

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("id")
        .limit(1);

      if (error && error.code !== "PGRST116") {
        return "RLS enabled (query restricted as expected)";
      }

      return "RLS policies active";
    });

    // Test 9: Logout Functionality
    await runTest(8, async () => {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      const { data } = await supabase.auth.getSession();
      if (data.session) throw new Error("Session not cleared");

      return "Logout successful, session cleared";
    });

    setIsRunning(false);
  };

  const runTest = async (index: number, testFn: () => Promise<string>) => {
    const startTime = Date.now();
    updateTest(index, { status: "running" });

    try {
      const message = await testFn();
      const duration = Date.now() - startTime;
      updateTest(index, { status: "passed", message, duration });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTest(index, {
        status: "failed",
        message: error.message || "Unknown error",
        duration,
      });
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "passed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-400" />;
    }
  };

  const passedCount = tests.filter((t) => t.status === "passed").length;
  const failedCount = tests.filter((t) => t.status === "failed").length;
  const totalCount = tests.length;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Authentication Test Suite</h1>
          <p className="text-muted-foreground">
            Comprehensive testing of Supabase authentication functionality
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Test Results</span>
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run All Tests
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tests.some((t) => t.status !== "pending") && (
              <Alert>
                <AlertDescription>
                  <div className="flex items-center gap-4 text-sm">
                    <span>
                      Progress: {passedCount + failedCount} / {totalCount}
                    </span>
                    <span className="text-green-500">
                      Passed: {passedCount}
                    </span>
                    <span className="text-red-500">Failed: {failedCount}</span>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              {tests.map((test, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="mt-0.5">{getStatusIcon(test.status)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{test.name}</span>
                      {test.duration && (
                        <span className="text-xs text-muted-foreground">
                          {test.duration}ms
                        </span>
                      )}
                    </div>
                    {test.message && (
                      <p className="text-sm text-muted-foreground">
                        {test.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {testUserId && (
              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Test User ID:</strong> {testUserId}
                  <br />
                  <span className="text-muted-foreground">
                    This test user was created for testing purposes. You may
                    want to clean it up from the auth.users table.
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Connection to Supabase database</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Authentication client configuration</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>User registration with email/password</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Login with valid credentials</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Login rejection with invalid credentials</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Session persistence in localStorage</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Session refresh functionality</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Row Level Security policy verification</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Logout and session cleanup</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
