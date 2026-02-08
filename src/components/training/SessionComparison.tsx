import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Activity, Clock, Flame, Heart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface WearableSession {
  id: string;
  date: string;
  session_type: string;
  duration_minutes: number;
  calories_burned: number;
  avg_heart_rate: number;
  training_load: number;
  perceived_exertion: number;
  max_heart_rate?: number;
  distance_km?: number;
}

interface SessionComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session1: WearableSession | null;
  session2: WearableSession | null;
}

export const SessionComparison = ({
  open,
  onOpenChange,
  session1,
  session2,
}: SessionComparisonProps) => {
  if (!session1 || !session2) return null;

  const calculateDifference = (val1: number, val2: number): number => {
    if (val2 === 0) return 0;
    return ((val1 - val2) / val2) * 100;
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff > 5) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (diff < -5) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getDifferenceColor = (diff: number, higherIsBetter: boolean = true) => {
    const isPositive = higherIsBetter ? diff > 0 : diff < 0;
    if (Math.abs(diff) < 5) return "text-muted-foreground";
    return isPositive ? "text-green-500" : "text-red-500";
  };

  const metrics = [
    {
      label: "Duration",
      icon: Clock,
      value1: session1.duration_minutes,
      value2: session2.duration_minutes,
      unit: "min",
      higherIsBetter: true,
    },
    {
      label: "Calories",
      icon: Flame,
      value1: session1.calories_burned,
      value2: session2.calories_burned,
      unit: "kcal",
      higherIsBetter: true,
    },
    {
      label: "Avg Heart Rate",
      icon: Heart,
      value1: session1.avg_heart_rate,
      value2: session2.avg_heart_rate,
      unit: "bpm",
      higherIsBetter: false,
    },
    {
      label: "Training Load",
      icon: Activity,
      value1: session1.training_load,
      value2: session2.training_load,
      unit: "",
      higherIsBetter: true,
    },
  ];

  if (session1.distance_km && session2.distance_km) {
    metrics.push({
      label: "Distance",
      icon: TrendingUp,
      value1: session1.distance_km,
      value2: session2.distance_km,
      unit: "km",
      higherIsBetter: true,
    });
  }

  if (session1.max_heart_rate && session2.max_heart_rate) {
    metrics.push({
      label: "Max Heart Rate",
      icon: Heart,
      value1: session1.max_heart_rate,
      value2: session2.max_heart_rate,
      unit: "bpm",
      higherIsBetter: false,
    });
  }

  if (session1.perceived_exertion && session2.perceived_exertion) {
    metrics.push({
      label: "Perceived Exertion",
      icon: Activity,
      value1: session1.perceived_exertion,
      value2: session2.perceived_exertion,
      unit: "/10",
      higherIsBetter: false,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Session Comparison</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-secondary/30">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Session 1
                </Badge>
                <h3 className="font-semibold text-foreground">
                  {session1.session_type || "Training Session"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(session1.date), "MMMM d, yyyy")}
                </p>
              </div>
            </Card>

            <Card className="p-4 bg-secondary/30">
              <div className="space-y-2">
                <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  Session 2
                </Badge>
                <h3 className="font-semibold text-foreground">
                  {session2.session_type || "Training Session"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(session2.date), "MMMM d, yyyy")}
                </p>
              </div>
            </Card>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Metrics Comparison</h4>
            {metrics.map((metric) => {
              const diff = calculateDifference(metric.value1 || 0, metric.value2 || 0);
              const Icon = metric.icon;

              return (
                <div
                  key={metric.label}
                  className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center p-4 rounded-lg border border-border/50 bg-secondary/20"
                >
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {metric.value1 || 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {metric.unit}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2 px-4 border-x border-border/50">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                      {metric.label}
                    </p>
                    {Math.abs(diff) > 0 && (
                      <div className="flex items-center gap-1">
                        {getDifferenceIcon(diff)}
                        <span
                          className={cn(
                            "text-xs font-semibold",
                            getDifferenceColor(diff, metric.higherIsBetter)
                          )}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="text-left">
                    <p className="text-2xl font-bold text-foreground">
                      {metric.value2 || 0}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {metric.unit}
                      </span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <Card className="p-4 bg-secondary/30">
            <h4 className="text-sm font-semibold text-foreground mb-3">Summary</h4>
            <div className="space-y-2 text-sm">
              {metrics.map((metric) => {
                const diff = calculateDifference(metric.value1 || 0, metric.value2 || 0);
                const isImprovement = metric.higherIsBetter ? diff > 0 : diff < 0;

                if (Math.abs(diff) > 5) {
                  return (
                    <div
                      key={metric.label}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded",
                        isImprovement ? "bg-green-500/10" : "bg-red-500/10"
                      )}
                    >
                      {isImprovement ? (
                        <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-500 flex-shrink-0" />
                      )}
                      <p className="text-foreground">
                        <span className="font-medium">{metric.label}</span>{" "}
                        {isImprovement ? "improved" : "decreased"} by{" "}
                        <span className="font-semibold">{Math.abs(diff).toFixed(1)}%</span>
                      </p>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
