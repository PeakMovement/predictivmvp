import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, Eye, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { AnomalyEntry } from "@/hooks/useSystemHealth";

interface AnomalyAlertsListProps {
  anomalies: AnomalyEntry[];
  isLoading: boolean;
  onAcknowledge: (id: string, notes?: string) => Promise<boolean>;
}

export function AnomalyAlertsList({ anomalies, isLoading, onAcknowledge }: AnomalyAlertsListProps) {
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEntry | null>(null);
  const [notes, setNotes] = useState("");
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      critical: "bg-destructive/20 text-destructive border-destructive/30",
      high: "bg-orange-500/20 text-orange-500 border-orange-500/30",
      medium: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      low: "bg-blue-500/20 text-blue-500 border-blue-500/30",
    };
    return variants[severity] || "bg-muted text-muted-foreground";
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case "spike":
        return <TrendingUp size={14} className="text-orange-500" />;
      case "drop":
        return <TrendingDown size={14} className="text-blue-500" />;
      default:
        return <AlertTriangle size={14} className="text-yellow-500" />;
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedAnomaly) return;
    
    setIsAcknowledging(true);
    const success = await onAcknowledge(selectedAnomaly.id, notes);
    setIsAcknowledging(false);
    
    if (success) {
      setSelectedAnomaly(null);
      setNotes("");
    }
  };

  const unacknowledged = anomalies.filter((a) => !a.acknowledged_at);
  const acknowledged = anomalies.filter((a) => a.acknowledged_at);

  if (isLoading) {
    return (
      <Card className="bg-glass border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg">Anomaly Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass border-glass-border">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle size={18} className="text-primary" />
          Anomaly Alerts
          {unacknowledged.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {unacknowledged.length} new
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3">
            {anomalies.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <CheckCircle size={48} className="mx-auto mb-4 text-green-500 opacity-50" />
                <p>No anomalies detected</p>
              </div>
            ) : (
              <>
                {unacknowledged.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Unacknowledged
                    </h4>
                    {unacknowledged.map((anomaly) => (
                      <div
                        key={anomaly.id}
                        className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 hover:bg-destructive/10 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getAnomalyIcon(anomaly.anomaly_type)}
                              <span className="font-medium">{anomaly.metric_name}</span>
                              <Badge className={cn("text-xs", getSeverityBadge(anomaly.severity))}>
                                {anomaly.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {anomaly.anomaly_type === "spike" ? "Unusual increase" : 
                               anomaly.anomaly_type === "drop" ? "Unusual decrease" : 
                               "Missing data"} detected
                              {anomaly.deviation_percent && (
                                <span className="ml-1">
                                  ({anomaly.deviation_percent > 0 ? "+" : ""}
                                  {anomaly.deviation_percent.toFixed(1)}%)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(anomaly.detected_at), "MMM d, yyyy 'at' HH:mm")}
                            </p>
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedAnomaly(anomaly)}
                              >
                                <Eye size={14} className="mr-1" />
                                Review
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-background border-glass-border">
                              <DialogHeader>
                                <DialogTitle>Review Anomaly</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Metric</p>
                                    <p className="font-medium">{anomaly.metric_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Type</p>
                                    <p className="font-medium capitalize">{anomaly.anomaly_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Current Value</p>
                                    <p className="font-medium">{anomaly.current_value ?? "N/A"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Baseline</p>
                                    <p className="font-medium">{anomaly.baseline_value ?? "N/A"}</p>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-sm text-muted-foreground">Notes (optional)</label>
                                  <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes about this anomaly..."
                                    className="mt-1 bg-glass border-glass-border"
                                  />
                                </div>
                                <Button
                                  onClick={handleAcknowledge}
                                  disabled={isAcknowledging}
                                  className="w-full"
                                >
                                  {isAcknowledging ? "Acknowledging..." : "Acknowledge & Dismiss"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {acknowledged.length > 0 && (
                  <div className="space-y-2 mt-6">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Acknowledged
                    </h4>
                    {acknowledged.slice(0, 5).map((anomaly) => (
                      <div
                        key={anomaly.id}
                        className="p-3 rounded-lg bg-muted/10 border border-glass-border opacity-60"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle size={14} className="text-green-500" />
                            <span className="text-sm">{anomaly.metric_name}</span>
                            <Badge variant="outline" className="text-xs">
                              {anomaly.anomaly_type}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(anomaly.acknowledged_at!), "MMM d")}
                          </span>
                        </div>
                        {anomaly.notes && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <MessageSquare size={10} />
                            {anomaly.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
