import { useState, useEffect } from "react";
import { Heart, Activity, Zap } from "lucide-react";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { supabase } from "@/integrations/supabase/client";
import { ActivityMetricsCard } from "@/components/fitbit/ActivityMetricsCard";
import { HeartRateMetricsCard } from "@/components/fitbit/HeartRateMetricsCard";
import { SleepMetricsCard } from "@/components/fitbit/SleepMetricsCard";

export const Health = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const { data: session, isLoading } = useWearableSessions(userId || undefined);

  // Extract values from wearable_sessions
  const heartRate = session?.resting_hr ?? "—";
  const hrv = session?.hrv ?? "—";
  const spo2 = session?.spo2_avg ?? "—";

  console.log("✅ Health live data:", { heartRate, hrv, spo2 });

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Health Metrics</h1>
          <p className="text-sm md:text-base text-muted-foreground">Monitor your health and wellness indicators</p>
        </div>

        {/* Wearable Sessions Overview */}
        {session && (
          <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 mb-8 shadow-glass animate-fade-in">
            <h2 className="text-xl font-semibold text-foreground mb-4">Latest Wearable Data (Oura)</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-muted-foreground">Resting HR</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{heartRate}</p>
                <p className="text-xs text-muted-foreground">bpm</p>
              </div>
              <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <p className="text-sm text-muted-foreground">HRV</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{hrv}</p>
                <p className="text-xs text-muted-foreground">ms</p>
              </div>
              <div className="bg-background/50 backdrop-blur border border-glass-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  <p className="text-sm text-muted-foreground">SpO₂</p>
                </div>
                <p className="text-2xl font-bold text-foreground">{spo2}</p>
                <p className="text-xs text-muted-foreground">%</p>
              </div>
            </div>
          </div>
        )}

        {/* Fitbit Metrics Section */}
        <div className="space-y-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground">Fitbit Inspire HR Metrics</h2>
          
          {/* Activity & Movement */}
          <ActivityMetricsCard />
          
          {/* Heart Rate */}
          <HeartRateMetricsCard />
          
          {/* Sleep Stages */}
          <SleepMetricsCard />
        </div>


        {/* View Insights Button */}
        <div className="bg-glass backdrop-blur-xl border border-glass-border rounded-2xl p-6 md:p-8 shadow-glass hover:bg-glass-highlight hover-glow transition-all duration-300 ease-out animate-fade-in">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-4xl">🌿</span>
            </div>
            <h3 className="text-xl md:text-2xl font-bold text-foreground">View Your Insights</h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Explore your progress and training patterns over time in an interactive visual journey.
            </p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('navigate-insights'))}
              className="w-full md:w-auto mt-4 bg-primary/80 hover:bg-primary text-primary-foreground border border-glass-border rounded-xl px-8 py-4 text-base md:text-lg font-semibold shadow-glow hover:scale-[1.02] active:scale-95 transition-all duration-200"
            >
              🌿 Open Insight Tree
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};