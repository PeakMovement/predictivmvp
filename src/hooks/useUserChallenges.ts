import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfWeek } from "date-fns";

export interface UserChallenge {
  id: string;
  challenge_title: string;
  challenge_description: string;
  challenge_type: string;
  target_value: number | null;
  current_progress: number;
  accepted_at: string;
  completed_at: string | null;
  week_start_date: string;
  status: "pending" | "active" | "completed" | "abandoned" | "expired";
  ai_reasoning?: string | null;
  expires_at?: string | null;
  progress_metric?: string | null;
}

export const useUserChallenges = (weekStart?: Date) => {
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChallenges = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      let query = supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (weekStart) {
        const weekStartStr = format(weekStart, "yyyy-MM-dd");
        query = query.eq("week_start_date", weekStartStr);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setChallenges((data || []) as UserChallenge[]);
    } catch (err) {
      console.error("Error fetching challenges:", err);
      setError("Failed to load challenges");
    } finally {
      setIsLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    fetchChallenges();

    // Subscribe to realtime updates
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel("user-challenges-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_challenges",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchChallenges();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupSubscription();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [fetchChallenges]);

  const acceptChallenge = async (challengeId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("user_challenges")
        .update({
          status: "active",
          accepted_at: new Date().toISOString(),
        })
        .eq("id", challengeId);

      if (updateError) throw updateError;
      await fetchChallenges();
    } catch (err) {
      console.error("Error accepting challenge:", err);
      throw err;
    }
  };

  const updateChallengeProgress = async (challengeId: string, progress: number) => {
    try {
      const { error: updateError } = await supabase
        .from("user_challenges")
        .update({ current_progress: progress })
        .eq("id", challengeId);

      if (updateError) throw updateError;
      await fetchChallenges();
    } catch (err) {
      console.error("Error updating challenge progress:", err);
      throw err;
    }
  };

  const completeChallenge = async (challengeId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("user_challenges")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", challengeId);

      if (updateError) throw updateError;
      await fetchChallenges();
    } catch (err) {
      console.error("Error completing challenge:", err);
      throw err;
    }
  };

  const abandonChallenge = async (challengeId: string) => {
    try {
      const { error: updateError } = await supabase
        .from("user_challenges")
        .update({ status: "abandoned" })
        .eq("id", challengeId);

      if (updateError) throw updateError;
      await fetchChallenges();
    } catch (err) {
      console.error("Error abandoning challenge:", err);
      throw err;
    }
  };

  const generateChallenges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-weekly-challenges", {
        body: { user_id: user.id },
      });

      if (error) throw error;
      await fetchChallenges();
      return data;
    } catch (err) {
      console.error("Error generating challenges:", err);
      throw err;
    }
  };

  const pendingChallenges = challenges.filter((c) => c.status === "pending");
  const activeChallenges = challenges.filter((c) => c.status === "active");
  const completedChallenges = challenges.filter((c) => c.status === "completed");

  return {
    challenges,
    pendingChallenges,
    activeChallenges,
    completedChallenges,
    isLoading,
    error,
    acceptChallenge,
    updateChallengeProgress,
    completeChallenge,
    abandonChallenge,
    generateChallenges,
    refresh: fetchChallenges,
  };
};
