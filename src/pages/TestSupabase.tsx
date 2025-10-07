import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function TestSupabase() {
  const [status, setStatus] = useState<"testing" | "success" | "error">("testing");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        // Test basic connection by selecting from health_daily table
        const { data: healthData, error: healthError } = await supabase
          .from("health_daily")
          .select("*")
          .limit(1);

        if (healthError) {
          console.error("❌ Supabase Error:", healthError);
          setError(healthError.message);
          setStatus("error");
        } else {
          console.log("✅ Supabase Data:", healthData);
          setData(healthData);
          setStatus("success");
        }
      } catch (err: any) {
        console.error("❌ Connection Error:", err);
        setError(err.message);
        setStatus("error");
      }
    }
    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Supabase Connection Test</h1>
        
        <div className={cn(
          "p-6 rounded-lg border",
          status === "testing" && "bg-muted border-muted-foreground/20",
          status === "success" && "bg-emerald-500/10 border-emerald-500/50",
          status === "error" && "bg-destructive/10 border-destructive/50"
        )}>
          {status === "testing" && (
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
              <p>Testing Supabase connection...</p>
            </div>
          )}
          
          {status === "success" && (
            <div>
              <p className="text-emerald-400 font-semibold mb-2">✅ Connection Successful!</p>
              <p className="text-sm text-muted-foreground mb-3">Check console logs for full details.</p>
              <pre className="bg-black/40 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
          
          {status === "error" && (
            <div>
              <p className="text-destructive font-semibold mb-2">❌ Connection Failed</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
