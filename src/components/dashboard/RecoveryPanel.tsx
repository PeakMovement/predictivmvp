import { useRecoveryTrends } from "@/hooks/useTrendData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { useMemo } from "react";

const getAcwrColor = (status: string) => {
  switch (status) {
    case "optimal": return "text-emerald-400";
    case "undertrained": return "text-sky-400";
    case "elevated_risk": return "text-amber-400";
    case "high_risk": return "text-rose-400";
    default: return "text-muted-foreground";
  }
};

const getAcwrZoneColor = (status: string) => {
  switch (status) {
    case "optimal": return { stroke: "#34d399", fill: "#34d399" };
    case "undertrained": return { stroke: "#38bdf8", fill: "#38bdf8" };
    case "elevated_risk": return { stroke: "#fbbf24", fill: "#fbbf24" };
    case "high_risk": return { stroke: "#f87171", fill: "#f87171" };
    default: return { stroke: "#6b7280", fill: "#6b7280" };
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
  const baseClass = "h-5 w-5 animate-number-pop";
  switch (status) {
    case "optimal": return <CheckCircle className={cn(baseClass, "text-emerald-400")} />;
    case "undertrained": return <AlertCircle className={cn(baseClass, "text-sky-400")} />;
    case "elevated_risk": return <AlertTriangle className={cn(baseClass, "text-amber-400")} />;
    case "high_risk": return <AlertTriangle className={cn(baseClass, "text-rose-400")} />;
    default: return null;
  }
};

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === "increasing") return <TrendingUp className="h-4 w-4" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4" />;
  return <Minus className="h-4 w-4" />;
};

// Animated circular gauge component
const ACWRGauge = ({ value, status }: { value: number; status: string }) => {
  const colors = getAcwrZoneColor(status);
  const circumference = 2 * Math.PI * 45;
  const progress = Math.min(Math.max(value / 2, 0), 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative w-32 h-32 mx-auto" role="img" aria-label={`ACWR gauge showing ${value.toFixed(2)}`}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background track */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Zone markers */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="hsl(var(--muted-foreground))"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.4} ${circumference * 0.6}`}
          strokeDashoffset={circumference * 0.6}
          strokeLinecap="round"
          opacity="0.2"
        />
        {/* Optimal zone indicator */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#34d399"
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.25} ${circumference * 0.75}`}
          strokeDashoffset={circumference * 0.6}
          strokeLinecap="round"
          opacity="0.3"
        />
        {/* Animated progress arc */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${colors.fill})`,
          }}
        />
        {/* Pulse ring effect */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-pulse-ring"
          opacity="0.5"
        />
      </svg>
      {/* Center value */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <span className={cn("text-2xl font-bold animate-number-pop", getAcwrColor(status))}>
            {value.toFixed(2)}
          </span>
          <p className="text-xs text-muted-foreground">ACWR</p>
        </div>
      </div>
    </div>
  );
};

// Animated bar component
const AnimatedBar = ({ 
  label, 
  value, 
  maxValue = 100, 
  color, 
  baseline,
  delay = 0 
}: { 
  label: string; 
  value: number | null; 
  maxValue?: number; 
  color: string;
  baseline?: number | null;
  delay?: number;
}) => {
  const percentage = value !== null ? Math.min((value / maxValue) * 100, 100) : 0;
  const baselinePercentage = baseline !== null && baseline !== undefined ? Math.min((baseline / maxValue) * 100, 100) : null;

  return (
    <div className="space-y-2" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm font-bold text-foreground animate-number-pop">
          {value?.toFixed(1) ?? "—"}
        </span>
      </div>
      <div className="relative h-2 bg-muted/50 rounded-full overflow-hidden">
        {/* Baseline marker */}
        {baselinePercentage !== null && (
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-muted-foreground/50 z-10"
            style={{ left: `${baselinePercentage}%` }}
          />
        )}
        {/* Animated fill */}
        <div 
          className={cn("h-full rounded-full origin-left animate-bar-grow", color)}
          style={{ 
            width: `${percentage}%`,
            animationDelay: `${delay}ms`,
          }}
        />
      </div>
    </div>
  );
};

export function RecoveryPanel() {
  const { data, isLoading, error } = useRecoveryTrends();

  const summary = useMemo(() => data?.summary, [data]);

  if (isLoading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Recovery & Load</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-32 mx-auto rounded-full" />
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
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
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

  if (!summary) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
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

  const acwr = summary.current_acwr ?? 0;

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border animate-panel-enter">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recovery & Load</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ACWR Gauge */}
        <div className="p-4 rounded-xl bg-background/50 border border-border/50">
          <div className="flex items-center justify-between mb-4">
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
          
          <ACWRGauge value={acwr} status={summary.acwr_status} />
          
          {/* Zone legend */}
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-sky-400" />
              <span className="text-muted-foreground">&lt;0.8</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-muted-foreground">0.8-1.3</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-muted-foreground">1.3-1.5</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-muted-foreground">&gt;1.5</span>
            </div>
          </div>
        </div>

        {/* Load Metrics with animated bars */}
        <div className="space-y-4 p-4 rounded-xl bg-background/50 border border-border/50">
          <AnimatedBar 
            label="Strain" 
            value={summary.strain} 
            maxValue={2000}
            color="bg-gradient-to-r from-rose-500 to-orange-500"
            delay={100}
          />
          <AnimatedBar 
            label="Monotony" 
            value={summary.monotony} 
            maxValue={3}
            color="bg-gradient-to-r from-amber-500 to-yellow-500"
            delay={200}
          />
        </div>

        {/* Load Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Acute Load (7d)", value: summary.acute_load, color: "from-sky-500/20 to-sky-500/5", border: "border-sky-500/30" },
            { label: "Chronic Load (28d)", value: summary.chronic_load, color: "from-indigo-500/20 to-indigo-500/5", border: "border-indigo-500/30" },
          ].map((item, idx) => (
            <div 
              key={item.label}
              className={cn(
                "p-3 rounded-xl border transition-all duration-300 hover:scale-105",
                "bg-gradient-to-br", item.color, item.border
              )}
              style={{ animationDelay: `${(idx + 3) * 100}ms` }}
            >
              <p className="text-xs text-muted-foreground mb-1">{item.label}</p>
              <p className="text-xl font-bold text-foreground animate-number-pop">
                {item.value?.toFixed(1) ?? "—"}
              </p>
            </div>
          ))}
        </div>

        {/* Recovery Score */}
        {summary.recovery_score !== null && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Recovery Score</span>
              <span className="text-2xl font-bold text-emerald-400 animate-number-pop">
                {Math.round(summary.recovery_score)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
