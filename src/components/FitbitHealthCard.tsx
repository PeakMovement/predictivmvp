import { useState, useEffect } from "react";
import { Heart, Moon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FitbitActivityData {
  user_id: string;
  activity: {
    data?: {
      summary?: {
        restingHeartRate?: number;
        heartRateZones?: Array<{ name: string; minutes: number }>;
      };
    };
  };
  sleep?: {
    summary?: {
      totalMinutesAsleep?: number;
      totalTimeInBed?: number;
      efficiency?: number;
    };
  };
}

export const FitbitHealthCard = () => {
  const [healthData, setHealthData] = useState<FitbitActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealthData = async () => {
    try {
      const { data, error } = await supabase
        .from("fitbit_auto_data")
        .select("user_id, activity, sleep")
        .order("fetched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setHealthData(data as unknown as FitbitActivityData);
      }
    } catch (error) {
      console.error("Error fetching Fitbit health data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("fitbit-health-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fitbit_auto_data",
        },
        () => {
          fetchHealthData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRestingHR = () => {
    return healthData?.activity?.data?.summary?.restingHeartRate || 0;
  };

  const getSleepHours = () => {
    const minutes = healthData?.sleep?.summary?.totalMinutesAsleep;
    if (!minutes) return 0;
    return (minutes / 60).toFixed(1);
  };

  const getSleepEfficiency = () => {
    return healthData?.sleep?.summary?.efficiency || 0;
  };

  const getActiveZoneMinutes = () => {
    const zones = healthData?.activity?.data?.summary?.heartRateZones;
    if (!zones) return 0;
    
    // Sum up "Fat Burn", "Cardio", and "Peak" zones
    return zones
      .filter(zone => zone.name !== "Out of Range")
      .reduce((sum, zone) => sum + zone.minutes, 0);
  };

  if (loading) {
    return (
      <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass animate-pulse">
        <div className="h-8 bg-muted/20 rounded w-1/3 mb-4"></div>
        <div className="h-12 bg-muted/20 rounded w-1/2"></div>
      </div>
    );
  }

  if (!healthData) {
    return null;
  }

  return (
    <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 shadow-glass hover:bg-glass-highlight hover-glow transition-all duration-300">
      <div className="space-y-6">
        {/* Heart Rate Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Heart size={16} className="text-red-500" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Heart Health</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Resting HR</p>
              <p className="text-xl font-bold text-foreground">{getRestingHR()} bpm</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Active Minutes</p>
              <p className="text-xl font-bold text-foreground">{getActiveZoneMinutes()} min</p>
            </div>
          </div>
        </div>

        {/* Sleep Section */}
        <div className="pt-4 border-t border-glass-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Moon size={16} className="text-blue-500" />
            </div>
            <h4 className="text-sm font-semibold text-foreground">Sleep Quality</h4>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Sleep Hours</p>
              <p className="text-xl font-bold text-foreground">{getSleepHours()} hrs</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Efficiency</p>
              <p className="text-xl font-bold text-foreground">{getSleepEfficiency()}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
