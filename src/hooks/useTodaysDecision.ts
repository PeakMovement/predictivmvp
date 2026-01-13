import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { identifyRiskDrivers, RiskDriverResult, RiskMetrics, UserProfile, generateCorrectiveAction } from "@/lib/riskDrivers";

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
  riskDrivers?: RiskDriverResult;
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

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        // Fetch all required data in parallel (including user profile for personalization)
        const [
          sessionsResult, 
          profileResult, 
          recoveryResult, 
          lifestyleResult,
          trainingTrendsResult,
          recoveryTrendsResult,
          userBaselinesResult,
          symptomCheckInsResult,
          userTrainingResult,
          userInterestsResult,
          userInjuriesResult
        ] = await Promise.all([
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
            .maybeSingle(),
          supabase
            .from("training_trends")
            .select("*")
            .eq("user_id", user.id)
            .gte("date", sevenDaysAgoStr)
            .order("date", { ascending: false })
            .limit(7),
          supabase
            .from("recovery_trends")
            .select("*")
            .eq("user_id", user.id)
            .gte("period_date", sevenDaysAgoStr)
            .order("period_date", { ascending: false })
            .limit(7),
          supabase
            .from("user_baselines")
            .select("*")
            .eq("user_id", user.id),
          supabase
            .from("symptom_check_ins")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(10),
          supabase
            .from("user_training")
            .select("preferred_activities, training_frequency, intensity_preference")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_interests")
            .select("interests, hobbies")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("user_injuries")
            .select("injuries, injury_details")
            .eq("user_id", user.id)
            .maybeSingle()
        ]);

        const sessions = sessionsResult.data || [];
        const profile = profileResult.data;
        const recovery = recoveryResult.data;
        const lifestyle = lifestyleResult.data;
        const trainingTrends = trainingTrendsResult.data || [];
        const recoveryTrends = recoveryTrendsResult.data || [];
        const userBaselines = userBaselinesResult.data || [];
        const symptomCheckIns = symptomCheckInsResult.data || [];
        const userTraining = userTrainingResult.data;
        const userInterests = userInterestsResult.data;
        const userInjuries = userInjuriesResult.data;

        // Build user profile for personalization
        const userProfileData: UserProfile = {
          preferredActivities: userTraining?.preferred_activities || [],
          interests: [...(userInterests?.interests || []), ...(userInterests?.hobbies || [])],
          injuries: userInjuries?.injuries || [],
          injuryDetails: userInjuries?.injury_details as Record<string, unknown> | undefined,
          trainingFrequency: userTraining?.training_frequency || undefined,
          intensityPreference: userTraining?.intensity_preference || undefined
        };

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

        // Build risk metrics for risk driver analysis
        const latestTraining = trainingTrends[0];
        const latestRecovery = recoveryTrends[0];
        const hrvBaseline = userBaselines.find(b => b.metric === 'hrv')?.rolling_avg || null;
        const weeklyStrain = trainingTrends.reduce((sum, t) => sum + (t.strain || 0), 0);

        const riskMetrics: RiskMetrics = {
          acwr: latestRecovery?.acwr ?? latestTraining?.acwr ?? null,
          monotony: latestRecovery?.monotony ?? latestTraining?.monotony ?? null,
          strain: weeklyStrain || latestRecovery?.strain || null,
          hrvCurrent: hrvAvg,
          hrvBaseline: hrvBaseline,
          sleepScore: sleepScore,
          symptoms: symptomCheckIns.map(s => ({
            type: s.symptom_type,
            severity: s.severity,
            createdAt: s.created_at
          }))
        };

        // Identify risk drivers
        const riskDrivers = identifyRiskDrivers(riskMetrics);
        
        // Apply personalization to corrective action
        const symptomsForMatching = symptomCheckIns.map(s => ({
          type: s.symptom_type,
          severity: s.severity
        }));
        
        const personalizedAction = generateCorrectiveAction(
          riskDrivers.primary,
          riskDrivers.secondary,
          riskDrivers.riskLevel,
          userProfileData,
          symptomsForMatching
        );
        
        // Update riskDrivers with personalized action
        riskDrivers.correctiveAction = personalizedAction;

        // Determine decision based on context
        const generatedDecision = generateDecision({
          readinessScore,
          sleepScore,
          hrvAvg,
          avgReadiness,
          primaryGoal,
          stressLevel,
          sleepQuality,
          activityLevel: profile?.activity_level,
          riskDrivers,
          userProfile: userProfileData
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
  riskDrivers?: RiskDriverResult;
  userProfile?: UserProfile;
}

function generateDecision(context: DecisionContext): TodaysDecision | null {
  const { readinessScore, sleepScore, avgReadiness, primaryGoal, stressLevel, sleepQuality, riskDrivers } = context;

  // Need at least some data to generate a decision
  if (readinessScore === null && sleepScore === null && (!riskDrivers || riskDrivers.riskLevel === 'low')) {
    return null;
  }

  const isLowReadiness = readinessScore !== null && readinessScore < 70;
  const isPoorSleep = sleepScore !== null && sleepScore < 65;
  const isHighStress = stressLevel === "high" || stressLevel === "very_high";
  const isBelowAverage = avgReadiness !== null && readinessScore !== null && readinessScore < avgReadiness - 5;
  
  // Use risk drivers to inform the decision
  const hasElevatedRisk = riskDrivers && riskDrivers.riskLevel !== 'low';
  const primaryDriver = riskDrivers?.primary;

  // Get driver-specific reasoning
  const getDriverReasoning = (): string => {
    if (!primaryDriver) return "";
    
    const driverReasonings: Record<string, string> = {
      'monotony': "Your training patterns have been repetitive. Varying your workouts will promote better adaptation.",
      'acwr': "Your recent training load exceeds your chronic baseline. Scaling back helps prevent overuse issues.",
      'fatigue': "Accumulated fatigue is elevated. Your body needs more recovery time to adapt.",
      'hrv': "Your heart rate variability suggests your nervous system needs recovery. Light movement is ideal.",
      'sleep': "Sleep quality has been limiting recovery. Prioritizing rest will support your training.",
      'strain': "Weekly strain is high. Reducing load now protects your longer-term progress.",
      'symptoms': "Recent symptoms suggest your body is signaling for rest. Listen to these signals."
    };
    
    return driverReasonings[primaryDriver.id] || "";
  };

  // Determine the decision scenario
  if (hasElevatedRisk || isLowReadiness || isPoorSleep || isHighStress) {
    // Recovery focused decision
    const goalReference = primaryGoal 
      ? `This approach supports your goal of "${primaryGoal}" by ensuring you build from a stronger foundation.`
      : "This approach protects your progress over the coming weeks.";

    const driverReasoning = getDriverReasoning();
    const combinedReasoning = driverReasoning 
      ? `${driverReasoning} ${goalReference} Recovery days are where adaptation happens.`
      : `Your readiness signals suggest your body would benefit from a lighter day. ${goalReference} Recovery days are where adaptation happens.`;

    return {
      title: "Training intensity today",
      contextSummary: buildContextSummary(context),
      riskDrivers: riskDrivers,
      options: [
        {
          label: "Light movement or active recovery",
          description: "A shorter session focused on mobility, easy movement, or technique work.",
          reasoning: combinedReasoning,
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
      riskDrivers: riskDrivers,
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
      riskDrivers: riskDrivers,
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
