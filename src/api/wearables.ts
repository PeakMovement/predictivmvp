import { supabase } from "@/integrations/supabase/client";

// Interface matching the actual wearable_sessions DB schema
export interface WearableSession {
  id: string;
  user_id: string;
  source: string;
  date: string;
  sleep_score: number | null;
  readiness_score: number | null;
  activity_score: number | null;
  total_steps: number | null;
  active_calories: number | null;
  total_calories: number | null;
  resting_hr: number | null;
  hrv_avg: number | null;
  spo2_avg: number | null;
  fetched_at: string | null;
}

export interface WearableSummary {
  id: string;
  user_id: string;
  date: string;
  strain: number | null;
  monotony: number | null;
  acwr: number | null;
  readiness_index: number | null;
  source: string;
  updated_at: string | null;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Fetch wearable summary data for a user within an optional date range
 */
export async function getWearableSummary(
  userId: string,
  dateRange?: DateRange
): Promise<WearableSummary[]> {
  try {
    let query = supabase
      .from("wearable_summary")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (dateRange) {
      query = query
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as WearableSummary[];
  } catch (error) {
    console.error("[getWearableSummary] Error:", error);
    return [];
  }
}

/**
 * Fetch wearable session data for a user within an optional date range
 */
export async function getWearableSessions(
  userId: string,
  dateRange?: DateRange,
  source?: string
): Promise<WearableSession[]> {
  try {
    let query = supabase
      .from("wearable_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (dateRange) {
      query = query
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate);
    }

    if (source) {
      query = query.eq("source", source);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as WearableSession[];
  } catch (error) {
    console.error("[getWearableSessions] Error:", error);
    return [];
  }
}

/**
 * Insert or update a wearable session
 */
export async function upsertWearableSession(
  session: Omit<WearableSession, "id" | "fetched_at">
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("wearable_sessions")
      .upsert(session, {
        onConflict: "user_id,source,date",
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[upsertWearableSession] Error:", error);
    return false;
  }
}

/**
 * Insert or update a wearable summary
 */
export async function upsertWearableSummary(
  summary: Omit<WearableSummary, "id" | "updated_at">
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("wearable_summary")
      .upsert(summary, {
        onConflict: "user_id,source,date",
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("[upsertWearableSummary] Error:", error);
    return false;
  }
}
