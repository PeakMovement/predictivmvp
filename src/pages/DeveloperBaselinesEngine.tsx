import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Loader2, Play, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface FunctionStatus {
  name: string;
  displayName: string;
  status: 'success' | 'failed' | 'running' | 'unknown';
  lastRun: string | null;
  isRunning: boolean;
  duration?: number;
}

interface BaselineData {
  metric: string;
  baseline_value: number;
  current_value: number;
  deviation_pct: number;
  risk_status: 'low' | 'moderate' | 'high';
}

interface LogEntry {
  id: string;
  function_name: string;
  status: string;
  started_at: string;
  duration_ms?: number;
  error_message?: string;
}

export default function DeveloperBaselinesEngine() {
  const [functions, setFunctions] = useState<FunctionStatus[]>([
    { name: 'fetch-fitbit-auto', displayName: 'Fetch Fitbit Data', status: 'unknown', lastRun: null, isRunning: false },
    { name: 'calculate-baseline', displayName: 'Calculate Baseline', status: 'unknown', lastRun: null, isRunning: false },
    { name: 'calculate-deviation', displayName: 'Calculate Deviation', status: 'unknown', lastRun: null, isRunning: false },
  ]);
  const [baselines, setBaselines] = useState<BaselineData[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch latest status for each function
      const { data: logData } = await supabase
        .from('function_execution_log')
        .select('*')
        .order('started_at', { ascending: false });

      // Update function statuses
      const updatedFunctions = functions.map(func => {
        const latestLog = logData?.find(log => log.function_name === func.name);
        return {
          ...func,
          status: (latestLog?.status as any) || 'unknown',
          lastRun: latestLog?.started_at || null,
          duration: latestLog?.duration_ms,
          isRunning: latestLog?.status === 'running',
        };
      });
      setFunctions(updatedFunctions);

      // Fetch baseline results
      const { data: baselineData } = await supabase
        .from('yves_profiles')
        .select('metric, baseline_value, current_value, deviation_pct, risk_status')
        .limit(10);

      if (baselineData) {
        setBaselines(baselineData as BaselineData[]);
      }

      // Set recent logs
      setLogs((logData || []).slice(0, 10) as LogEntry[]);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('function_execution_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'function_execution_log',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const runFunction = async (functionName: string) => {
    const funcIndex = functions.findIndex(f => f.name === functionName);
    
    // Update UI to show running state
    const updatedFunctions = [...functions];
    updatedFunctions[funcIndex].isRunning = true;
    setFunctions(updatedFunctions);

    try {
      const response = await supabase.functions.invoke(functionName, {
        body: {},
      });

      if (response.error) throw response.error;

      toast({
        title: 'Function executed successfully',
        description: `${functions[funcIndex].displayName} completed`,
      });

      // Refresh data after successful run
      setTimeout(fetchData, 1000);
      
    } catch (error: any) {
      console.error('Error running function:', error);
      toast({
        title: 'Function execution failed',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      // Reset running state
      const resetFunctions = [...functions];
      resetFunctions[funcIndex].isRunning = false;
      setFunctions(resetFunctions);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'running':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30"><Clock className="w-3 h-3 mr-1" />Unknown</Badge>;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'moderate':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'high':
        return 'text-red-400 bg-red-500/10 border-red-500/20';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
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
            🧠 Baseline & Deviation Engine
          </h1>
          <p className="text-muted-foreground mt-1">Developer Control Panel</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Function Status Table */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl">📊 Function Status</CardTitle>
          <CardDescription>Monitor and trigger edge functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Function Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Run</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Duration</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {functions.map((func) => (
                  <tr key={func.name} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4 font-medium">{func.displayName}</td>
                    <td className="py-3 px-4">{getStatusBadge(func.status)}</td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {func.lastRun ? new Date(func.lastRun).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted-foreground">
                      {func.duration ? `${func.duration}ms` : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        onClick={() => runFunction(func.name)}
                        disabled={func.isRunning}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {func.isRunning ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Run Now
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Baseline Results Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">🎯 Baseline Results</h2>
        {baselines.length === 0 ? (
          <Card className="bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl p-8 text-center">
            <p className="text-muted-foreground">No baseline data available yet. Run the functions to generate data.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {baselines.map((baseline, idx) => (
              <Card
                key={idx}
                className={`bg-black/40 backdrop-blur-xl border rounded-2xl transition-all hover:scale-[1.02] ${getRiskColor(baseline.risk_status)}`}
              >
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{baseline.metric}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Baseline:</span>
                    <span className="font-medium">{baseline.baseline_value.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-medium">{baseline.current_value.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Deviation:</span>
                    <span className="font-semibold">{baseline.deviation_pct.toFixed(1)}%</span>
                  </div>
                  <Badge className={`w-full justify-center ${getRiskColor(baseline.risk_status)}`}>
                    {baseline.risk_status.toUpperCase()}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Execution Logs */}
      <Card className="bg-black/40 backdrop-blur-xl border-white/10 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl">📝 Execution Logs</CardTitle>
          <CardDescription>Latest 10 function executions</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No execution logs yet</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusBadge(log.status)}
                    <span className="font-medium">{log.function_name}</span>
                    {log.duration_ms && (
                      <span className="text-xs text-muted-foreground">({log.duration_ms}ms)</span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.started_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
