import { Activity, Clock, AlertTriangle, RotateCcw, Bell, Key, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SystemHealthData } from "@/hooks/useSystemHealth";

interface SystemHealthOverviewProps {
  data: SystemHealthData | null;
  isLoading: boolean;
}

export function SystemHealthOverview({ data, isLoading }: SystemHealthOverviewProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-glass border-glass-border animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 bg-muted/20 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: "Sync Success Rate",
      value: `${data.syncSuccessRate.toFixed(1)}%`,
      icon: Activity,
      color: data.syncSuccessRate >= 95 ? "text-green-500" : data.syncSuccessRate >= 80 ? "text-yellow-500" : "text-destructive",
      bgColor: data.syncSuccessRate >= 95 ? "bg-green-500/20" : data.syncSuccessRate >= 80 ? "bg-yellow-500/20" : "bg-destructive/20",
      trend: data.syncSuccessRate >= 95 ? "up" : "down",
    },
    {
      label: "Avg Latency",
      value: `${data.avgLatencyMs.toFixed(0)}ms`,
      icon: Clock,
      color: data.avgLatencyMs <= 500 ? "text-green-500" : data.avgLatencyMs <= 1000 ? "text-yellow-500" : "text-destructive",
      bgColor: data.avgLatencyMs <= 500 ? "bg-green-500/20" : data.avgLatencyMs <= 1000 ? "bg-yellow-500/20" : "bg-destructive/20",
      trend: data.avgLatencyMs <= 500 ? "up" : "down",
    },
    {
      label: "Rate Limits",
      value: data.activeRateLimits.toString(),
      icon: AlertTriangle,
      color: data.activeRateLimits === 0 ? "text-green-500" : "text-yellow-500",
      bgColor: data.activeRateLimits === 0 ? "bg-green-500/20" : "bg-yellow-500/20",
      trend: data.activeRateLimits === 0 ? "up" : "down",
    },
    {
      label: "Retry Queue",
      value: data.retryQueueBacklog.toString(),
      icon: RotateCcw,
      color: data.retryQueueBacklog === 0 ? "text-green-500" : data.retryQueueBacklog <= 5 ? "text-yellow-500" : "text-destructive",
      bgColor: data.retryQueueBacklog === 0 ? "bg-green-500/20" : data.retryQueueBacklog <= 5 ? "bg-yellow-500/20" : "bg-destructive/20",
      trend: data.retryQueueBacklog === 0 ? "up" : "down",
    },
    {
      label: "Anomalies",
      value: data.unacknowledgedAnomalies.toString(),
      icon: Bell,
      color: data.unacknowledgedAnomalies === 0 ? "text-green-500" : data.unacknowledgedAnomalies <= 3 ? "text-yellow-500" : "text-destructive",
      bgColor: data.unacknowledgedAnomalies === 0 ? "bg-green-500/20" : data.unacknowledgedAnomalies <= 3 ? "bg-yellow-500/20" : "bg-destructive/20",
      trend: data.unacknowledgedAnomalies === 0 ? "up" : "down",
    },
    {
      label: "Tokens Expiring",
      value: data.tokensExpiringIn24h.toString(),
      icon: Key,
      color: data.tokensExpiringIn24h === 0 ? "text-green-500" : "text-yellow-500",
      bgColor: data.tokensExpiringIn24h === 0 ? "bg-green-500/20" : "bg-yellow-500/20",
      trend: data.tokensExpiringIn24h === 0 ? "up" : "down",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="bg-glass border-glass-border hover:bg-glass-highlight transition-all">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", metric.bgColor)}>
                <metric.icon size={16} className={metric.color} />
              </div>
              {metric.trend === "up" ? (
                <TrendingUp size={14} className="text-green-500" />
              ) : (
                <TrendingDown size={14} className="text-destructive" />
              )}
            </div>
            <p className={cn("text-2xl font-bold", metric.color)}>{metric.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{metric.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
