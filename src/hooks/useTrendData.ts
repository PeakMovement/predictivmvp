import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DailyTrend {
  period_date: string;
  metric_name: string;
  value: number | null;
  baseline: number | null;
  delta: number | null;
  trend_direction: "increasing" | "stable" | "declining";
}

interface WeeklyTrendMetric {
  value: number | null;
  baseline: number | null;
  delta: number | null;
  week_over_week_pct: number | null;
  trend_direction: string;
}

interface WeeklyTrend {
  period_start: string;
  period_end: string;
  metrics: Record<string, WeeklyTrendMetric>;
}

interface RecoveryTrend {
  period_date: string;
  chronic_load: number | null;
  acute_load: number | null;
  acwr: number | null;
  acwr_trend: string;
  monotony: number | null;
  strain: number | null;
  recovery_score: number | null;
}

interface RecoverySummary {
  current_acwr: number | null;
  acwr_status: string;
  acwr_trend: string;
  chronic_load: number | null;
  acute_load: number | null;
  monotony: number | null;
  strain: number | null;
  recovery_score: number | null;
}

interface ActivityTrend {
  period_date: string;
  steps_avg_7d: number | null;
  steps_baseline: number | null;
  steps_delta: number | null;
  calories_avg_7d: number | null;
  calories_baseline: number | null;
  calories_delta: number | null;
  activity_score_avg: number | null;
  trend_direction: string;
}

interface ActivitySummary {
  current_steps_avg: number | null;
  steps_change: number | null;
  steps_trend: string;
  current_calories_avg: number | null;
  calories_change: number | null;
  activity_score: number | null;
}

async function fetchWithAuth(functionName: string, params?: Record<string, string>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL || "https://ixtwbkikyuexskdgfpfq.supabase.co"}/functions/v1/${functionName}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

export function useDailyHealthTrends(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["daily-health-trends", startDate, endDate],
    queryFn: async () => {
      const result = await fetchWithAuth("get-daily-health-trends", {
        start_date: startDate || "",
        end_date: endDate || "",
      });
      return result as { success: boolean; data: DailyTrend[]; count: number };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useWeeklyHealthTrends() {
  return useQuery({
    queryKey: ["weekly-health-trends"],
    queryFn: async () => {
      const result = await fetchWithAuth("get-weekly-health-trends");
      return result as { success: boolean; data: WeeklyTrend[]; raw: any[]; count: number };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useRecoveryTrends(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["recovery-trends", startDate, endDate],
    queryFn: async () => {
      const result = await fetchWithAuth("get-recovery-trends", {
        start_date: startDate || "",
        end_date: endDate || "",
      });
      return result as { success: boolean; data: RecoveryTrend[]; summary: RecoverySummary | null; count: number };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useActivityTrends(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ["activity-trends", startDate, endDate],
    queryFn: async () => {
      const result = await fetchWithAuth("get-activity-trends", {
        start_date: startDate || "",
        end_date: endDate || "",
      });
      return result as { success: boolean; data: ActivityTrend[]; summary: ActivitySummary | null; count: number };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}

export function useRefreshTrends() {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["daily-health-trends"] });
    queryClient.invalidateQueries({ queryKey: ["weekly-health-trends"] });
    queryClient.invalidateQueries({ queryKey: ["recovery-trends"] });
    queryClient.invalidateQueries({ queryKey: ["activity-trends"] });
  };

  return { refreshAll };
}