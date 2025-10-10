import { useEffect, useState } from "react";
import { testFitbitTokenExchange } from "@/mock-fitbit-data";
import { Card } from "@/components/ui/card";

const Index = () => {
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Auto-test the Fitbit Edge Function on component mount
    console.log("🧪 Running Fitbit Edge Function test...");
    testFitbitTokenExchange()
      .then((result) => {
        setTestResult(result);
        setIsLoading(false);
        console.log("✅ Test result stored:", result);
      })
      .catch((error) => {
        setTestResult({ error: error.message });
        setIsLoading(false);
        console.error("❌ Test failed:", error);
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-2xl w-full">
        <h1 className="mb-4 text-4xl font-bold">Fitbit Edge Function Test</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Testing the Supabase Edge Function connection
        </p>

        <Card className="p-6" id="fitbit-test-result">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p>Testing endpoint...</p>
            </div>
          ) : (
            <div className="text-left">
              <h3 className="text-lg font-semibold mb-4">Test Results:</h3>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </Card>

        <p className="mt-4 text-sm text-muted-foreground">
          Check browser console for detailed logs
        </p>
      </div>
    </div>
  );
};

export default Index;
