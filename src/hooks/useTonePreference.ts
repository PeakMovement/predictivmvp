import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TonePreference = "coach" | "warm" | "supportive" | "strategic" | "balanced";

export interface ToneSettings {
  preference: TonePreference;
  isLoading: boolean;
  updatePreference: (newPreference: TonePreference) => Promise<void>;
}

// Contextual tone rules - these cannot be overridden by preference
type ContextType = "training" | "wellbeing" | "goal" | "general";

export function useTonePreference(): ToneSettings {
  const [preference, setPreference] = useState<TonePreference>("balanced");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPreference() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("tone_preference")
          .eq("id", user.id)
          .maybeSingle();

        if (!error && data?.tone_preference) {
          setPreference(data.tone_preference as TonePreference);
        }
      } catch (error) {
        console.error("Error fetching tone preference:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreference();
  }, []);

  const updatePreference = async (newPreference: TonePreference) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ tone_preference: newPreference })
        .eq("id", user.id);

      if (!error) {
        setPreference(newPreference);
      }
    } catch (error) {
      console.error("Error updating tone preference:", error);
    }
  };

  return { preference, isLoading, updatePreference };
}

// Helper function to get effective tone based on context and preference
// Context always takes priority, but preference fine-tunes within that context
export function getEffectiveTone(
  contextType: ContextType,
  baseTone: "coach" | "warm" | "strategic",
  userPreference: TonePreference
): "coach" | "warm" | "strategic" {
  // Context rules are absolute - they determine the base tone
  // Training content: always coach-like
  // Wellbeing/recovery content: always warm
  // Goal/work content: always strategic
  
  // If preference matches context, use it directly
  if (contextType === "training") {
    return "coach"; // Training always uses coach tone
  }
  
  if (contextType === "wellbeing") {
    // Warm and supportive are similar for wellbeing
    return "warm"; // Wellbeing always uses warm tone
  }
  
  if (contextType === "goal") {
    return "strategic"; // Goals always use strategic tone
  }
  
  // For general content, preference can influence more
  if (userPreference === "balanced") {
    return baseTone; // Use the component's default tone
  }
  
  // Map preference to valid tone
  if (userPreference === "supportive") {
    return "warm"; // Supportive maps to warm
  }
  
  return userPreference as "coach" | "warm" | "strategic";
}

// Get tone-specific language modifiers based on preference
export function getToneModifiers(preference: TonePreference): {
  emphasisWords: string[];
  sentenceStyle: "direct" | "gentle" | "measured";
} {
  switch (preference) {
    case "coach":
      return {
        emphasisWords: ["focus", "execute", "build", "progress"],
        sentenceStyle: "direct"
      };
    case "warm":
    case "supportive":
      return {
        emphasisWords: ["support", "nurture", "restore", "gentle"],
        sentenceStyle: "gentle"
      };
    case "strategic":
      return {
        emphasisWords: ["optimize", "balance", "consider", "approach"],
        sentenceStyle: "measured"
      };
    case "balanced":
    default:
      return {
        emphasisWords: ["support", "progress", "balance"],
        sentenceStyle: "measured"
      };
  }
}
