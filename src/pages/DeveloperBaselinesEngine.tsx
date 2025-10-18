import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, Play, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FunctionStatus {
  name: string;
  displayName: string;
  status: "success" | "failed" | "running" | "unknown";
  lastRun: string | null;
  isRunning: boolean;
  duration?: number;
}

interface BaselineData {
  metric: string;
  baseline_value: number;
  current_value: number;
  deviation_pct: number;
  risk_status: "low" | "moderate" | "high";
}

interface LogEntry {
  id: string;
  function_name: string;
  status: string;
  started_at: string;
  duration_ms?: number;
  error_message?: string;
}

interface Insight {
  metric: string;
  deviation_pct: number;
  risk_status: string;
  insight: string;
  suggestion: string;
  updated_at: string;
}

export default function DeveloperBaselinesEngine() {
  const [functions, setFunctions] = useState<FunctionStatus[]>([
    { name: "fetch-fitbit-auto", displayName: "Fetch Fitbit Data", status: "unknown", lastRun: null, isRunning: false },
    {
      name: "calculate-baseline",
      displayName: "Calculate Baseline",
      status: "unknown",
      lastRun: null,
      isRunning: false,
    },
    {
      name: "calculate-deviation",
      displayName: "Calculate Deviation",
      status: "unknown",
      lastRun: null,
      isRunning: false,
    },
  ]);
  const [baselines, setBaselines] = useState<BaselineData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Function execution logs
      const { data: logData } = await supabase
        .from("function_execution_log")
        .select("*")
        .order("started_at", { ascending: false });

      const updatedFunctions = functions.map((func) => {
        const latestLog = logData?.find((log) => log.function_name === func.name);
        return {
          ...func,
          status: (latestLog?.status as any) || "unknown",
          lastRun: latestLog?.started_at || null,
          duration: latestLog?.duration_ms,
          isRunning: latestLog?.status === "running",
        };
      });
      setFunctions(updatedFunctions);

      // Baselines
      const { data: baselineData } = await supabase
        .from("yves_profiles")
        .select("metric, baseline_value, current_value, deviation_pct, risk_status")
        .limit(10);
      if (baselineData) setBaselines(baselineData as BaselineData[]);

      // Insights
      const { data: insightsData, error: insightsError } = await (supabase.rpc as any)("get_latest_insights");
      if (!insightsError && insightsData) setInsights(insightsData as Insight[]);

      // Feedback
      const { data: feedbackData, error: feedbackError } = await (supabase.from as any)("insight_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (!feedbackError && feedbackData) setFeedback(feedbackData);

      setLogs((logData || []).slice(0, 10) as LogEntry[]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("function_execution_updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "function_execution_log" }, () => {
        fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const runFunction = async (functionName: string) => {
    const funcIndex = functions.findIndex((f) => f.name === functionName);
    const updatedFunctions = [...functions];
    updatedFunctions[funcIndex].isRunning = true;
    setFunctions(updatedFunctions);

    try {
      const response = await supabase.functions.invoke(functionName, { body: {} });
      if (response.error) throw response.error;

      toast({ title: "Function executed successfully", description: `${functions[funcIndex].displayName} completed` });
      setTimeout(fetchData, 1000);
    } catch (error: any) {
      toast({
        title: "Function execution failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      updatedFunctions[funcIndex].isRunning = false;
      setFunctions(updatedFunctions);
    }
  };

  const runPipeline = async () => {
    toast({ title: "Starting pipeline...", description: "Running baseline → deviation → insights" });
    try {
      await supabase.functions.invoke("calculate-baseline", { body: {} });
      await supabase.functions.invoke("calculate-deviation", { body: {} });
      await supabase.functions.invoke("generate-insights", { body: {} });
      toast({ title: "Pipeline completed!", description: "All functions executed successfully" });
      setTimeout(fetchData, 1000);
    } catch (error: any) {
      toast({ title: "Pipeline failed", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "moderate":
        return "text-orange-400 bg-orange-500/10 border-orange-500/20";
      case "high":
        return "text-red-400 bg-red-500/10 border-red-500/20";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            🧠 Baseline, Deviation & Insights Engine
          </h1>
          <p className="text-muted-foreground mt-1">Developer Control Panel</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runPipeline} variant="default" size="sm" className="bg-primary/20 hover:bg-primary/30">
            <Play className="w-4 h-4 mr-2" /> Run Pipeline
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Live Insights Feed */}
      <div>
        <h2 className="text-xl font-semibold mt-8 mb-4">🧩 Live Insights Feed</h2>
        {insights.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">No insights yet. Run pipeline to generate insights.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {insights.map((insight, idx) => (
              <Card
                key={idx}
                className="bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl p-4 hover:scale-[1.02] transition-all"
              >
                <CardHeader>
                  <CardTitle className="capitalize text-lg">{insight.metric}</CardTitle>
                  <CardDescription>{new Date(insight.updated_at).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-1">{insight.insight}</p>
                  <p className="text-indigo-400 text-sm">{insight.suggestion}</p>
                  <p className="text-xs text-muted-foreground mt-2">Deviation: {insight.deviation_pct.toFixed(1)}%</p>
                  <Badge className={`mt-2 ${getRiskColor(insight.risk_status)}`}>
                    {insight.risk_status.toUpperCase()}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={async () => {
                      const { error } = await (supabase.from as any)("insight_feedback").insert({
                        user_id: "675cf687-785f-447b-b4da-42a84ecc0da4", // replace later with auth.user.id
                        metric: insight.metric,
                        insight: insight.insight,
                        suggestion: insight.suggestion,
                        action_taken: "Acknowledged",
                        feedback_score: 1,
                      });
                      if (error) {
                        toast({ title: "Save failed", description: error.message, variant: "destructive" });
                      } else {
                        toast({ title: "Insight saved!", description: "Marked as acknowledged." });
                        fetchData();
                      }
                    }}
                  >
                    Mark as Acknowledged
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 💬 User Feedback Log */}
      <div>
        <h2 className="text-xl font-semibold mt-8 mb-4">💬 User Feedback Log</h2>
        {feedback.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">No feedback entries yet. Users haven’t responded to insights.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {feedback.map((entry, idx) => (
              <Card
                key={idx}
                className="bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl p-4 hover:scale-[1.02] transition-all"
              >
                <CardHeader>
                  <CardTitle className="capitalize text-lg">{entry.metric}</CardTitle>
                  <CardDescription>{new Date(entry.created_at).toLocaleString()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 text-sm mb-1">{entry.insight}</p>
                  <p className="text-indigo-400 text-sm mb-2">Action: {entry.action_taken}</p>
                  <Badge className="w-full justify-center">{`Score: ${entry.feedback_score}`}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
