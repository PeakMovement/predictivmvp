import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LogEntry {
  function_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

export const DeveloperPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    const { data, error } = await (supabase.from as any)("function_execution_log")
      .select("function_name, status, started_at, completed_at, duration_ms, error_message")
      .order("started_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setLogs(data);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 10000);
      return () => clearInterval(interval);
    }
  }, [isExpanded]);

  const runFunction = async (functionName: string, displayName: string) => {
    setIsLoading(true);
    toast({
      title: `${displayName} triggered`,
      description: "Processing...",
    });

    try {
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;

      toast({
        title: `${displayName} completed`,
        description: "Check logs below for details",
      });
      
      console.log(`${functionName} result:`, data);
      fetchLogs();
    } catch (error: any) {
      toast({
        title: `${displayName} failed`,
        description: error.message || "Unknown error",
        variant: "destructive",
      });
      console.error(`${functionName} error:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "success":
      case "completed":
        return "text-green-500";
      case "error":
      case "failed":
        return "text-red-500";
      case "running":
        return "text-yellow-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl shadow-glass overflow-hidden transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-glass-highlight transition-colors"
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>Developer Mode</span>
          <span className="text-xl">⚙️</span>
        </h3>
        {isExpanded ? (
          <ChevronUp className="text-primary" size={20} />
        ) : (
          <ChevronDown className="text-primary" size={20} />
        )}
      </button>

      {isExpanded && (
        <div className="p-6 pt-0 space-y-6">
          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              onClick={() => runFunction("calculate-baseline", "Baseline Engine")}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <Play size={16} className="mr-2" />
              Run Baseline Engine
            </Button>
            <Button
              onClick={() => runFunction("calculate-deviation", "Deviation Engine")}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <Play size={16} className="mr-2" />
              Run Deviation Engine
            </Button>
            <Button
              onClick={() => runFunction("generate-insights", "Insights Engine")}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <Play size={16} className="mr-2" />
              Run Insights Engine
            </Button>
          </div>

          {/* Execution Logs */}
          <div>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
              Execution Logs (auto-refreshes every 10s)
            </h4>
            <div className="bg-black/30 border border-white/10 rounded-xl max-h-64 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No logs available
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {logs.map((log, index) => (
                    <div key={index} className="p-3 hover:bg-white/5 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {log.function_name}
                        </span>
                        <span className={`text-xs font-semibold ${getStatusColor(log.status)}`}>
                          {log.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatTimestamp(log.started_at)}</span>
                        {log.duration_ms && (
                          <span>{log.duration_ms}ms</span>
                        )}
                      </div>
                      {log.error_message && (
                        <div className="mt-1 text-xs text-red-400 truncate">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
