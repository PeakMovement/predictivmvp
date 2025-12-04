import { useRecoveryTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

const getAcwrColor = (status: string) => {
  switch (status) {
    case "optimal": return "text-green-500";
    case "undertrained": return "text-blue-500";
    case "elevated_risk": return "text-amber-500";
    case "high_risk": return "text-red-500";
    default: return "text-muted-foreground";
  }
};

const getAcwrBgColor = (status: string) => {
  switch (status) {
    case "optimal": return "bg-green-500";
    case "undertrained": return "bg-blue-500";
    case "elevated_risk": return "bg-amber-500";
    case "high_risk": return "bg-red-500";
    default: return "bg-muted";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "optimal": return "Optimal Training";
    case "undertrained": return "Under-training";
    case "elevated_risk": return "Elevated Risk";
    case "high_risk": return "High Injury Risk";
    default: return "Unknown";
  }
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "optimal": return <CheckCircle className="h-5 w-5 text-green-500" />;
    case "undertrained": return <AlertCircle className="h-5 w-5 text-blue-500" />;
    case "elevated_risk": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case "high_risk": return <AlertTriangle className="h-5 w-5 text-red-500" />;
    default: return null;
  }
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "increasing") return <TrendingUp className="h-4 w-4" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
};

export function RecoveryPanel() {
  const { data, isLoading, error } = useRecoveryTrends();

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recovery & Load</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recovery & Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Unable to load recovery data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;

  if (!summary) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recovery & Load</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Not enough data for recovery analysis</p>
            <p className="text-sm mt-1">Continue tracking to see load trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ACWR gauge visualization (0.8 - 1.5 optimal range)
  const acwr = summary.current_acwr ?? 0;
  const acwrProgress = Math.min(Math.max((acwr / 2) * 100, 0), 100);

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recovery & Load</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ACWR Gauge */}
        <div className="p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <StatusIcon status={summary.acwr_status} />
              <span className={cn("font-semibold", getAcwrColor(summary.acwr_status))}>
                {getStatusLabel(summary.acwr_status)}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendIcon trend={summary.acwr_trend} />
              <span className="text-xs capitalize">{summary.acwr_trend}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground">
                {acwr.toFixed(2)}
              </span>
              <span className="text-sm text-muted-foreground">ACWR</span>
            </div>
            
            {/* Visual gauge */}
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div className="absolute inset-y-0 left-[40%] w-[25%] bg-green-500/30" />
              <div
                className={cn("h-full rounded-full transition-all", getAcwrBgColor(summary.acwr_status))}
                style={{ width: `${acwrProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.0</span>
              <span className="text-green-500">0.8 - 1.3</span>
              <span>2.0</span>
            </div>
          </div>
        </div>

        {/* Load Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Acute Load (7d)</p>
            <p className="text-xl font-bold text-foreground">
              {summary.acute_load?.toFixed(1) ?? "—"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Chronic Load (28d)</p>
            <p className="text-xl font-bold text-foreground">
              {summary.chronic_load?.toFixed(1) ?? "—"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Strain</p>
            <p className="text-xl font-bold text-foreground">
              {summary.strain?.toFixed(1) ?? "—"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Monotony</p>
            <p className="text-xl font-bold text-foreground">
              {summary.monotony?.toFixed(2) ?? "—"}
            </p>
          </div>
        </div>

        {/* Recovery Score */}
        {summary.recovery_score !== null && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Recovery Score</span>
              <span className="text-2xl font-bold text-emerald-500">
                {Math.round(summary.recovery_score)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}