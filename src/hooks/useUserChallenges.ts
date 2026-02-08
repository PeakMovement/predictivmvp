import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, format } from "date-fns";

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
  status: "active" | "completed" | "abandoned";
}

export const useUserChallenges = (weekStart?: Date) => {
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, [weekStart]);

  const fetchChallenges = async () => {
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
        .order("accepted_at", { ascending: false });

      // If weekStart is provided, filter by that week
      if (weekStart) {
        const weekStartStr = format(weekStart, "yyyy-MM-dd");
        query = query.eq("week_start_date", weekStartStr);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setChallenges(data || []);
    } catch (err) {
      console.error("Error fetching challenges:", err);
      setError("Failed to load challenges");
    } finally {
      setIsLoading(false);
    }
  };

  const updateChallengeProgress = async (
    challengeId: string,
    progress: number
  ) => {
    try {
      const { error: updateError } = await supabase
        .from("user_challenges")
        .update({ current_progress: progress })
        .eq("id", challengeId);

      if (updateError) throw updateError;

      // Refresh challenges
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

      // Refresh challenges
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

      // Refresh challenges
      await fetchChallenges();
    } catch (err) {
      console.error("Error abandoning challenge:", err);
      throw err;
    }
  };

  const getActiveChallenges = () => {
    return challenges.filter((c) => c.status === "active");
  };

  const getCompletedChallenges = () => {
    return challenges.filter((c) => c.status === "completed");
  };

  return {
    challenges,
    activeChallenges: getActiveChallenges(),
    completedChallenges: getCompletedChallenges(),
    isLoading,
    error,
    updateChallengeProgress,
    completeChallenge,
    abandonChallenge,
    refresh: fetchChallenges,
  };
};
