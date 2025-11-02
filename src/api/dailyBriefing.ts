import { supabase } from "@/integrations/supabase/client";

export type BriefingCategory = 'full' | 'recovery' | 'sleep' | 'activity' | 'goals' | 'tip';

export interface DailyBriefing {
  id: string;
  user_id: string;
  date: string;
  content: string;
  context_used: Record<string, unknown>;
  created_at: string;
  category?: string;
}

/**
 * Fetch the latest daily briefing for the current user
 */
export async function getLatestBriefing(category: BriefingCategory = 'full'): Promise<DailyBriefing | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", today)
      .eq("category", category)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[getLatestBriefing] Error:", error);
    return null;
  }
}

/**
 * Generate a new daily briefing for the current user
 */
export async function generateBriefing(category: BriefingCategory = 'full'): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data, error } = await supabase.functions.invoke("generate-daily-briefing", {
      body: { user_id: user.id, category },
    });

    if (error) throw error;

    if (data?.success) {
      return { success: true };
    } else {
      return { success: false, error: data?.error || "Failed to generate briefing" };
    }
  } catch (error) {
    console.error("[generateBriefing] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get briefing history for the current user
 */
export async function getBriefingHistory(limit = 7): Promise<DailyBriefing[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from("daily_briefings")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("[getBriefingHistory] Error:", error);
    return [];
  }
}
