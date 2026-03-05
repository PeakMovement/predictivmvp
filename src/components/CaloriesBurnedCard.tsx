import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface WearableCalorieData {
  user_id: string;
  active_calories: number | null;
  total_calories: number | null;
  fetched_at: string | null;
}

export const CaloriesBurnedCard = () => {
  const [calorieData, setCalorieData] = useState<WearableCalorieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchCalorieData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use wearable_sessions instead of non-existent fitbit_auto_data
      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("user_id, active_calories, total_calories, fetched_at")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      setCalorieData(data as WearableCalorieData | null);
    } catch (error) {
      console.error("Error fetching calorie data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch calorie data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchCalorieData();

    // Set up real-time subscription
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel("wearable-calories-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "wearable_sessions",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchCalorieData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });

  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCalorieData();
  };

  const getCalories = () => {
    if (!calorieData) return "0";
    return String(calorieData.total_calories || calorieData.active_calories || 0);
  };

  const getLastSyncTime = () => {
    if (!calorieData?.fetched_at) return "Never";
    return formatDistanceToNow(new Date(calorieData.fetched_at), { addSuffix: true });
  };

  if (loading) {
    return (
      <Card className="bg-glass backdrop-blur-xl border-glass-border hover:shadow-glow transition-all duration-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            Calories Burned Today
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-glass backdrop-blur-xl border-glass-border hover:shadow-glow transition-all duration-300 group">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500 group-hover:animate-pulse" />
            Calories Burned Today
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            {getCalories()}
          </span>
          <span className="text-lg text-muted-foreground">kcal</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Last synced: {getLastSyncTime()}
        </div>
        {!calorieData && (
          <p className="text-sm text-muted-foreground">
            No data available. Trigger the sync function to fetch data.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
