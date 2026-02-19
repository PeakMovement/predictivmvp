import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useGarminRunningDistance = () => {
  const [runningDistance, setRunningDistance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRunningDistance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
        console.log("No user logged in");
        setIsLoading(false);
        return;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("wearable_sessions")
        .select("total_steps, active_calories, running_distance_km, total_distance_km")
        .eq("user_id", user.id)
        .eq("source", "garmin")
        .gte("date", sevenDaysAgoStr);

      if (error) {
        console.error("Error fetching Garmin running distance:", error);
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Prefer actual GPS distance columns over step estimation
        const hasGpsDistance = data.some(
          (s) => s.running_distance_km != null || s.total_distance_km != null
        );

        let totalDistance: number;
        if (hasGpsDistance) {
          totalDistance = data.reduce(
            (sum, session) =>
              sum + (session.running_distance_km ?? session.total_distance_km ?? 0),
            0
          );
          console.log(`✅ Garmin 7-day GPS distance: ${totalDistance.toFixed(2)} km`);
        } else {
          // Fallback: estimate from steps (avg stride ~0.762m)
          totalDistance = data.reduce(
            (sum, session) => sum + ((session.total_steps || 0) * 0.000762),
            0
          );
          console.log(`✅ Garmin 7-day step-estimated distance: ${totalDistance.toFixed(2)} km`);
        }
        setRunningDistance(totalDistance);
      } else {
        console.log("No Garmin running data found in last 7 days");
        setRunningDistance(0);
      }
    } catch (error) {
      console.error("Error in fetchRunningDistance:", error);
      setRunningDistance(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        channel = supabase
          .channel("wearable_sessions_garmin_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wearable_sessions",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              console.log("🔔 Garmin wearable session updated:", payload);
              fetchRunningDistance();
            }
          )
          .subscribe();
      }
    };

    fetchRunningDistance();
    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchRunningDistance]);

  return {
    runningDistance,
    isLoading,
    refresh: fetchRunningDistance,
  };
};
