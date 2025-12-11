import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Flame, Footprints, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TodaySession {
  date: string;
  activity_score: number | null;
  total_steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
}

export function TodayActivitySection() {
  const [session, setSession] = useState<TodaySession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTodayActivity = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("wearable_sessions")
          .select("date, activity_score, total_steps, active_calories, total_calories")
          .eq("user_id", user.id)
          .gte("date", today)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Error fetching today's activity:", error);
        } else {
          setSession(data);
        }
      } catch (error) {
        console.error("Error fetching today's activity:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTodayActivity();
  }, []);

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

  if (!session) {
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
              <p className="text-sm text-muted-foreground">No activity data yet today</p>
              <p className="text-xs text-muted-foreground mt-1">Data syncs throughout the day</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Today's Activity
          </CardTitle>
          {session.activity_score && (
            <Badge variant="secondary" className="text-sm">
              Score: {session.activity_score}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Steps */}
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <Footprints className="h-5 w-5 text-blue-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">
              {session.total_steps?.toLocaleString() ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">Steps</p>
          </div>

          {/* Active Calories */}
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">
              {session.active_calories?.toLocaleString() ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">Active Cal</p>
          </div>

          {/* Total Calories */}
          <div className="text-center p-3 rounded-lg bg-secondary/30">
            <Flame className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-lg font-semibold text-foreground">
              {session.total_calories?.toLocaleString() ?? "--"}
            </p>
            <p className="text-xs text-muted-foreground">Total Cal</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
