import { useState, useEffect } from "react";
import { useWearableSessions } from "@/hooks/useWearableSessions";
import { supabase } from "@/integrations/supabase/client";
import { OuraReadinessCard } from "@/components/oura/OuraReadinessCard";
import { OuraSleepCard } from "@/components/oura/OuraSleepCard";
import { OuraActivityCard } from "@/components/oura/OuraActivityCard";
import { OuraHRVCard } from "@/components/oura/OuraHRVCard";
import OuraSyncStatus from "@/components/OuraSyncStatus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export const Health = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);

  const { data: session, isLoading } = useWearableSessions(userId || undefined);

  console.log("✅ Health page Oura data:", session);

  return (
    <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-32">
      <div className="container mx-auto px-4 md:px-6 pt-6 md:pt-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Ōura Ring Metrics</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-4">
            Real-time health and wellness data from your Ōura Ring
          </p>
          <div className="flex justify-center">
            <OuraSyncStatus />
          </div>
        </div>

        {!userId ? (
          <div className="text-center py-12 px-4 bg-glass backdrop-blur-xl border border-glass-border rounded-2xl">
            <p className="text-muted-foreground mb-4">Please log in to view your Ōura Ring data</p>
            <p className="text-sm text-muted-foreground">Connect your account to see your metrics</p>
          </div>
        ) : (
          <>
            {/* No Data Alert */}
            {!isLoading && !session && (
              <Alert className="mb-6 border-blue-500/50 bg-blue-500/10">
                <InfoIcon className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-500">No Oura Data Yet</AlertTitle>
                <AlertDescription className="text-sm text-muted-foreground">
                  <p className="mb-2">Your Oura Ring is connected, but no data has synced yet. Here's what to do:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Wear your Oura Ring tonight</li>
                    <li>Open the Oura mobile app in the morning to sync</li>
                    <li>Return here and click "Update Now" after 8 AM local time</li>
                  </ol>
                  <p className="mt-3 text-xs">
                    💡 <strong>Tip:</strong> Sleep data processes around 8 AM. Activity data updates throughout the day.
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {/* Three Main Score Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <OuraReadinessCard
                score={session?.readiness_score ?? null}
                restingHR={session?.resting_hr ?? null}
                hrv={session?.hrv ?? null}
                isLoading={isLoading}
              />
              <OuraSleepCard
                score={session?.sleep_score ?? null}
                totalSleep={session?.sleep_duration_hours ?? null}
                deepSleep={session?.deep_sleep_hours ?? null}
                remSleep={session?.rem_sleep_hours ?? null}
                lightSleep={session?.light_sleep_hours ?? null}
                efficiency={session?.efficiency ?? null}
                isLoading={isLoading}
              />
              <OuraActivityCard
                score={session?.activity_score ?? null}
                steps={session?.total_steps ?? null}
                activeCalories={session?.active_calories ?? null}
                totalCalories={session?.total_calories ?? null}
                isLoading={isLoading}
              />
            </div>

            {/* Detailed Metrics Section */}
            <div className="space-y-6 mb-8">
              <h2 className="text-xl font-semibold text-foreground">Detailed Metrics</h2>

              {/* HRV & Heart Rate Card */}
              <OuraHRVCard
                hrv={session?.hrv ?? null}
                restingHR={session?.resting_hr ?? null}
                avgHR={session?.avg_hr_bpm ?? null}
                spo2={session?.spo2_avg ?? null}
                isLoading={isLoading}
              />
            </div>

            {/* Data Source Info */}
            {session && (
              <div className="bg-glass/50 backdrop-blur-xl border border-glass-border rounded-xl p-4 mb-8 text-center">
                <p className="text-xs text-muted-foreground">
                  Last updated: {session.date ? new Date(session.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'} • Source: Ōura Ring
                </p>
              </div>
            )}
          </>
        )}

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
