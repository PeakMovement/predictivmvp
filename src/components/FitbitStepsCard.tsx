import { useState, useEffect } from "react";
import { Activity, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface FitbitActivityData {
  user_id: string;
  activity: {
    data?: {
      summary?: {
        steps?: number;
        caloriesOut?: number;
        distance?: Array<{ distance: number }>;
        activeMinutes?: number;
      };
    };
    synced_at?: string;
  };
  fetched_at: string;
}

export const FitbitStepsCard = () => {
  const [activityData, setActivityData] = useState<FitbitActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivityData = async () => {
    try {
      const { data, error } = await supabase
        .from("fitbit_auto_data" as any)
        .select("user_id, activity, fetched_at")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setActivityData(data as any as FitbitActivityData);
      }
    } catch (error) {
      console.error("Error fetching Fitbit activity data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("fitbit-activity-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "fitbit_auto_data",
        },
        () => {
          fetchActivityData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fitbit_auto_data",
        },
        () => {
          fetchActivityData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/.netlify/functions/sync-auto", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Sync failed");
      }

      toast({
        title: "Success",
        description: "Fitbit data synced successfully",
      });

      await fetchActivityData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync Fitbit data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getSteps = () => {
    return activityData?.activity?.data?.summary?.steps || 0;
  };

  const getCalories = () => {
    return activityData?.activity?.data?.summary?.caloriesOut || 0;
  };

  const getDistance = () => {
    const distances = activityData?.activity?.data?.summary?.distance;
    if (distances && distances.length > 0) {
      return distances[0].distance.toFixed(2);
    }
    return "0";
  };

  const getActiveMinutes = () => {
    return activityData?.activity?.data?.summary?.activeMinutes || 0;
  };

  const getLastSyncTime = () => {
    const syncedAt = activityData?.activity?.synced_at || activityData?.fetched_at;
    if (!syncedAt) return "Never";
    
    const date = new Date(syncedAt);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-pulse">
        <div className="h-8 bg-muted/20 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-muted/20 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover-glow transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
            <Activity size={20} className="text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Fitbit Activity</h3>
            <p className="text-xs text-muted-foreground">Last synced: {getLastSyncTime()}</p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          size="sm"
          variant="outline"
          className="bg-glass/30 border-glass-border hover:bg-glass-highlight"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Steps</p>
          <p className="text-2xl font-bold text-foreground">{getSteps().toLocaleString()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Calories</p>
          <p className="text-2xl font-bold text-foreground">{getCalories().toLocaleString()}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Distance</p>
          <p className="text-2xl font-bold text-foreground">{getDistance()} km</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Active Min</p>
          <p className="text-2xl font-bold text-foreground">{getActiveMinutes()}</p>
        </div>
      </div>
    </div>
  );
};
