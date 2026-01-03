import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTodaysDecision } from "./useTodaysDecision";

export interface PlanAlignmentItem {
  planType: "training" | "nutrition";
  planName: string;
  alignmentStatus: "aligned" | "modified" | "adjusted";
  explanation: string;
  tone: "coach" | "warm";
}

export interface PlanAlignment {
  items: PlanAlignmentItem[];
  hasPlans: boolean;
}

export function usePlanAlignment() {
  const [alignment, setAlignment] = useState<PlanAlignment>({ items: [], hasPlans: false });
  const [isLoading, setIsLoading] = useState(true);
  const { decision } = useTodaysDecision();

  useEffect(() => {
    async function fetchPlanAlignment() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Fetch uploaded documents that are training or nutrition plans
        const { data: documents } = await supabase
          .from("user_documents")
          .select("id, document_type, file_name, ai_summary, parsed_content")
          .eq("user_id", user.id)
          .in("document_type", ["training", "nutrition"])
          .eq("processing_status", "completed");

        if (!documents || documents.length === 0) {
          setAlignment({ items: [], hasPlans: false });
          setIsLoading(false);
          return;
        }

        // Fetch current readiness context
        const { data: latestSession } = await supabase
          .from("wearable_sessions")
          .select("readiness_score, sleep_score")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle();

        const readinessScore = latestSession?.readiness_score || null;
        const sleepScore = latestSession?.sleep_score || null;

        // Get recommended option from today's decision
        const recommendedOption = decision?.options.find(o => o.isRecommended);
        const isRecoveryFocused = recommendedOption?.label.toLowerCase().includes("light") || 
                                   recommendedOption?.label.toLowerCase().includes("recovery") ||
                                   recommendedOption?.label.toLowerCase().includes("moderate");

        // Generate alignment items for each plan
        const alignmentItems: PlanAlignmentItem[] = documents.map(doc => {
          const isTraining = doc.document_type === "training";
          const planName = doc.file_name.replace(/\.[^/.]+$/, "");

          if (isTraining) {
            return generateTrainingAlignment(planName, readinessScore, sleepScore, isRecoveryFocused);
          } else {
            return generateNutritionAlignment(planName, readinessScore, sleepScore, isRecoveryFocused);
          }
        });

        setAlignment({ items: alignmentItems, hasPlans: true });
      } catch (error) {
        console.error("Error fetching plan alignment:", error);
        setAlignment({ items: [], hasPlans: false });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlanAlignment();
  }, [decision]);

  return { alignment, isLoading };
}

function generateTrainingAlignment(
  planName: string,
  readinessScore: number | null,
  sleepScore: number | null,
  isRecoveryFocused: boolean
): PlanAlignmentItem {
  const isLowReadiness = readinessScore !== null && readinessScore < 70;
  const isPoorSleep = sleepScore !== null && sleepScore < 65;

  if (isRecoveryFocused && (isLowReadiness || isPoorSleep)) {
    return {
      planType: "training",
      planName,
      alignmentStatus: "adjusted",
      explanation: "Your training plan remains in place. Today we are suggesting a lighter approach to support your recovery. You can return to your planned intensity when your body signals stronger readiness. This temporary adjustment protects your ability to train well in the days ahead.",
      tone: "coach"
    };
  } else if (isRecoveryFocused) {
    return {
      planType: "training",
      planName,
      alignmentStatus: "modified",
      explanation: "Your training plan structure stays the same. The suggestion to moderate effort today fits within your overall program. Think of this as working with your plan rather than against it. Consistent moderate effort often builds more capacity than sporadic intense sessions.",
      tone: "coach"
    };
  } else {
    return {
      planType: "training",
      planName,
      alignmentStatus: "aligned",
      explanation: "Today's recommendation aligns well with your training plan. Your current readiness supports following the planned session as written. This is a good day to execute your program with confidence and focus on quality movement.",
      tone: "coach"
    };
  }
}

function generateNutritionAlignment(
  planName: string,
  readinessScore: number | null,
  sleepScore: number | null,
  isRecoveryFocused: boolean
): PlanAlignmentItem {
  const isLowReadiness = readinessScore !== null && readinessScore < 70;
  const isPoorSleep = sleepScore !== null && sleepScore < 65;

  if (isRecoveryFocused && (isLowReadiness || isPoorSleep)) {
    return {
      planType: "nutrition",
      planName,
      alignmentStatus: "adjusted",
      explanation: "Your nutrition plan continues as planned. On days when recovery is the priority, following your eating schedule supports the repair process. If your body feels extra tired, staying nourished and hydrated helps you bounce back more smoothly.",
      tone: "warm"
    };
  } else if (isRecoveryFocused) {
    return {
      planType: "nutrition",
      planName,
      alignmentStatus: "aligned",
      explanation: "Your nutrition plan pairs well with today's approach. Eating according to your plan provides steady energy for the day ahead. No changes needed. Your current nutrition supports both activity and rest.",
      tone: "warm"
    };
  } else {
    return {
      planType: "nutrition",
      planName,
      alignmentStatus: "aligned",
      explanation: "Your nutrition plan is well suited for today. With good readiness, your body is positioned to use the fuel you provide effectively. Following your plan supports the quality session ahead.",
      tone: "warm"
    };
  }
}
