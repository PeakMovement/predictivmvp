import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DecisionOption {
  label: string;
  description: string;
  reasoning: string;
  isRecommended: boolean;
  tone: "coach" | "warm" | "strategic";
}

export interface TodaysDecision {
  title: string;
  options: DecisionOption[];
  contextSummary: string;
}

export function useTodaysDecision() {
  const [decision, setDecision] = useState<TodaysDecision | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDecisionContext() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch readiness data, goals, and context in parallel
        const today = new Date().toISOString().split("T")[0];
        const [sessionsResult, profileResult, recoveryResult, lifestyleResult] = await Promise.all([
          supabase
            .from("wearable_sessions")
            .select("readiness_score, sleep_score, hrv_avg, activity_score")
            .eq("user_id", user.id)
            .order("date", { ascending: false })
            .limit(7),
          supabase
            .from("user_profile")
            .select("goals, activity_level")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_recovery")
            .select("sleep_quality, recovery_methods")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_lifestyle")
            .select("stress_level")
            .eq("user_id", user.id)
            .maybeSingle()
        ]);

        const sessions = sessionsResult.data || [];
        const profile = profileResult.data;
        const recovery = recoveryResult.data;
        const lifestyle = lifestyleResult.data;

        // Analyze readiness trends
        const latestSession = sessions[0];
        const readinessScore = latestSession?.readiness_score || null;
        const sleepScore = latestSession?.sleep_score || null;
        const hrvAvg = latestSession?.hrv_avg || null;

        // Calculate recent trend
        const recentReadiness = sessions
          .filter(s => s.readiness_score)
          .map(s => s.readiness_score as number);
        const avgReadiness = recentReadiness.length > 0 
          ? recentReadiness.reduce((a, b) => a + b, 0) / recentReadiness.length 
          : null;

        const primaryGoal = profile?.goals?.[0] || null;
        const stressLevel = lifestyle?.stress_level || null;
        const sleepQuality = recovery?.sleep_quality || null;

        // Determine decision based on context
        const generatedDecision = generateDecision({
          readinessScore,
          sleepScore,
          hrvAvg,
          avgReadiness,
          primaryGoal,
          stressLevel,
          sleepQuality,
          activityLevel: profile?.activity_level
        });

        setDecision(generatedDecision);
      } catch (error) {
        console.error("Error fetching decision context:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDecisionContext();
  }, []);

  return { decision, isLoading };
}

interface DecisionContext {
  readinessScore: number | null;
  sleepScore: number | null;
  hrvAvg: number | null;
  avgReadiness: number | null;
  primaryGoal: string | null;
  stressLevel: string | null;
  sleepQuality: string | null;
  activityLevel: string | null;
}

function generateDecision(context: DecisionContext): TodaysDecision | null {
  const { readinessScore, sleepScore, avgReadiness, primaryGoal, stressLevel, sleepQuality } = context;

  // Need at least some data to generate a decision
  if (readinessScore === null && sleepScore === null) {
    return null;
  }

  const isLowReadiness = readinessScore !== null && readinessScore < 70;
  const isPoorSleep = sleepScore !== null && sleepScore < 65;
  const isHighStress = stressLevel === "high" || stressLevel === "very_high";
  const isBelowAverage = avgReadiness !== null && readinessScore !== null && readinessScore < avgReadiness - 5;

  // Determine the decision scenario
  if (isLowReadiness || isPoorSleep || isHighStress) {
    // Recovery focused decision
    const goalReference = primaryGoal 
      ? `This approach supports your goal of "${primaryGoal}" by ensuring you build from a stronger foundation.`
      : "This approach protects your progress over the coming weeks.";

    return {
      title: "Training intensity today",
      contextSummary: buildContextSummary(context),
      options: [
        {
          label: "Light movement or active recovery",
          description: "A shorter session focused on mobility, easy movement, or technique work.",
          reasoning: `Your readiness signals suggest your body would benefit from a lighter day. ${goalReference} Recovery days are where adaptation happens.`,
          isRecommended: true,
          tone: "warm"
        },
        {
          label: "Full intensity session",
          description: "Your planned workout at normal effort and volume.",
          reasoning: "You can proceed if today's session is important to you. Be aware that your body may take longer to recover, and you might find the effort feels harder than usual.",
          isRecommended: false,
          tone: "coach"
        }
      ]
    };
  } else if (isBelowAverage) {
    // Moderate day decision
    const goalReference = primaryGoal
      ? `Staying within moderate effort today keeps you on track for "${primaryGoal}" without accumulating unnecessary fatigue.`
      : "Staying moderate today helps maintain consistent progress.";

    return {
      title: "Session approach today",
      contextSummary: buildContextSummary(context),
      options: [
        {
          label: "Moderate effort with good form",
          description: "Work at 70 to 80 percent intensity with attention to movement quality.",
          reasoning: `Your recent trend shows a slight dip from your average. ${goalReference} Quality work at moderate effort often yields better long term results.`,
          isRecommended: true,
          tone: "coach"
        },
        {
          label: "Push for a personal best",
          description: "Challenge yourself with higher intensity or new training milestones.",
          reasoning: "You can attempt this if you feel ready. Keep in mind that peak performance typically follows periods of strong recovery, and today may not be your strongest day.",
          isRecommended: false,
          tone: "strategic"
        }
      ]
    };
  } else {
    // Good readiness decision
    const goalReference = primaryGoal
      ? `This is a good opportunity to make meaningful progress toward "${primaryGoal}".`
      : "This is a good day to invest in quality training.";

    return {
      title: "Making the most of today",
      contextSummary: buildContextSummary(context),
      options: [
        {
          label: "Productive training session",
          description: "Engage with focused, quality work that challenges you appropriately.",
          reasoning: `Your readiness is solid and your recent pattern supports a good training day. ${goalReference}`,
          isRecommended: true,
          tone: "coach"
        },
        {
          label: "Extra volume or intensity",
          description: "Add more sets, duration, or push beyond your normal training load.",
          reasoning: "You can do more if you choose. Consider that consistently good training often outperforms occasional extreme sessions, and tomorrow's readiness depends on today's choices.",
          isRecommended: false,
          tone: "strategic"
        }
      ]
    };
  }
}

function buildContextSummary(context: DecisionContext): string {
  const parts: string[] = [];

  if (context.readinessScore !== null) {
    parts.push(`readiness at ${context.readinessScore}`);
  }
  if (context.sleepScore !== null) {
    parts.push(`sleep score of ${context.sleepScore}`);
  }
  if (context.stressLevel) {
    const stressLabels: Record<string, string> = {
      low: "low stress",
      moderate: "moderate stress",
      high: "elevated stress",
      very_high: "high stress"
    };
    parts.push(stressLabels[context.stressLevel] || context.stressLevel);
  }

  if (parts.length === 0) return "";
  
  return `Based on ${parts.join(", ")}`;
}
