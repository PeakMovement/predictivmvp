import { supabase } from "@/integrations/supabase/client";

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
  resting_hr: number | null;
  hrv: number | null;
  spo2_avg: number | null;
  fetched_at: string;
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
  updated_at: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * Fetch wearable summary data for a user within an optional date range
 * Falls back to training_trends for legacy Fitbit data
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

    // If no data in new table, fallback to training_trends (legacy)
    if (!data || data.length === 0) {
      return getLegacyTrainingTrends(userId, dateRange);
    }

    return data as WearableSummary[];
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
 * Legacy fallback: fetch data from training_trends table
 * Maps old structure to new WearableSummary format
 */
async function getLegacyTrainingTrends(
  userId: string,
  dateRange?: DateRange
): Promise<WearableSummary[]> {
  try {
    let query = supabase
      .from("training_trends")
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

    // Map legacy structure to new format
    return (data || []).map((trend: Record<string, unknown>) => ({
      id: trend.id,
      user_id: trend.user_id,
      date: trend.date,
      strain: trend.strain,
      monotony: trend.monotony,
      acwr: trend.acwr,
      readiness_index: null, // Not in legacy data
      source: "fitbit", // Assume legacy data is from Fitbit
      updated_at: trend.created_at || new Date().toISOString(),
    }));
  } catch (error) {
    console.error("[getLegacyTrainingTrends] Error:", error);
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
