import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Flame, Clock } from "lucide-react";
import { useTrainingTrends } from "@/hooks/useTrainingTrends";
import { format, isToday, parseISO } from "date-fns";

export function TodayActivitySection() {
  const { trends, isLoading } = useTrainingTrends({ days: 7 });

  // Filter to today's session only - same data source as SessionLogList
  const todaySession = useMemo(() => {
    if (!trends || trends.length === 0) return null;
    
    const todayTrend = trends.find(t => {
      try {
        return isToday(parseISO(t.date));
      } catch {
        return false;
      }
    });
    
    if (!todayTrend || !todayTrend.training_load || todayTrend.training_load <= 0) {
      return null;
    }
    
    return todayTrend;
  }, [trends]);

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Today's Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!todaySession) {
    return (
      <Card className="bg-card/50 backdrop-blur-xl border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Today's Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-6 text-center">
            <div>
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No training session yet today</p>
              <p className="text-xs text-muted-foreground mt-1">Data syncs after workouts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trainingLoad = Math.round(todaySession.training_load || 0);
  const acwr = todaySession.acwr ? todaySession.acwr.toFixed(2) : null;
  const strain = todaySession.strain ? Math.round(todaySession.strain) : null;

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Today's Activity
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {format(parseISO(todaySession.date), "MMM d")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Training Load */}
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <Activity className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">
              {trainingLoad > 0 ? trainingLoad : "--"}
            </p>
            <p className="text-xs text-muted-foreground">Load</p>
          </div>

          {/* ACWR */}
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">
              {acwr ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">ACWR</p>
          </div>

          {/* Strain */}
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <Flame className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">
              {strain ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">Strain</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
