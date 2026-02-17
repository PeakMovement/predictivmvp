import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUserRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  device_connected: string | null;
  last_activity_date: string | null;
  readiness_score: number | null;
  risk_score_acwr: number | null;
  recovery_score: number | null;
  last_sync_time: string | null;
}

export function useAdminUserOverview() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "admin-user-overview"
      );
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error ?? "Unknown error");
      setUsers(data.data as AdminUserRow[]);
    } catch (e: any) {
      console.error("[useAdminUserOverview]", e);
      setError(e.message ?? String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { users, isLoading, error, refresh: fetch };
}
