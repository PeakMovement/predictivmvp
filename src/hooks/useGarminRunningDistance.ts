import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useGarminRunningDistance = () => {
  const [runningDistance, setRunningDistance] = useState<number>(0);
  const [isEstimated, setIsEstimated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRunningDistance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.id) {
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
        .in("source", ["garmin", "oura"])
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
          setIsEstimated(false);
        } else {
          // Fallback: estimate from steps (avg stride ~0.762m)
          totalDistance = data.reduce(
            (sum, session) => sum + ((session.total_steps || 0) * 0.000762),
            0
          );
          setIsEstimated(true);
        }
        setRunningDistance(totalDistance);
      } else {
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
    isEstimated,
    isLoading,
    refresh: fetchRunningDistance,
  };
};
