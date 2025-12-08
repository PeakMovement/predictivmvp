import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemHealthData {
  syncSuccessRate: number;
  avgLatencyMs: number;
  activeRateLimits: number;
  retryQueueBacklog: number;
  unacknowledgedAnomalies: number;
  tokensExpiringIn24h: number;
  lastCheck: string;
}

export interface SyncLogEntry {
  id: string;
  user_id: string;
  sync_type: string;
  status: string;
  latency_ms: number | null;
  entries_processed: number | null;
  error_message: string | null;
  created_at: string;
}

export interface AnomalyEntry {
  id: string;
  user_id: string;
  metric_name: string;
  anomaly_type: string;
  severity: string;
  current_value: number | null;
  baseline_value: number | null;
  deviation_percent: number | null;
  detected_at: string;
  acknowledged_at: string | null;
  notes: string | null;
}

export function useSystemHealth() {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemHealth = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("system-health-check");
      
      if (error) throw error;
      
      setHealthData({
        syncSuccessRate: data.sync_success_rate || 0,
        avgLatencyMs: data.avg_latency_ms || 0,
        activeRateLimits: data.active_rate_limits || 0,
        retryQueueBacklog: data.retry_queue_backlog || 0,
        unacknowledgedAnomalies: data.unacknowledged_anomalies || 0,
        tokensExpiringIn24h: data.tokens_expiring_24h || 0,
        lastCheck: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[useSystemHealth] Error fetching health:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch system health");
    }
  }, []);

  const fetchSyncLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("sync_health_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setSyncLogs(data || []);
    } catch (err) {
      console.error("[useSystemHealth] Error fetching sync logs:", err);
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("health_anomalies")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setAnomalies(data || []);
    } catch (err) {
      console.error("[useSystemHealth] Error fetching anomalies:", err);
    }
  }, []);

  const acknowledgeAnomaly = useCallback(async (anomalyId: string, notes?: string) => {
    try {
      const { error } = await supabase
        .from("health_anomalies")
        .update({ 
          acknowledged_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq("id", anomalyId);
      
      if (error) throw error;
      
      // Refresh anomalies
      await fetchAnomalies();
      return true;
    } catch (err) {
      console.error("[useSystemHealth] Error acknowledging anomaly:", err);
      return false;
    }
  }, [fetchAnomalies]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchSystemHealth(), fetchSyncLogs(), fetchAnomalies()]);
    setIsLoading(false);
  }, [fetchSystemHealth, fetchSyncLogs, fetchAnomalies]);

  useEffect(() => {
    refresh();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  return {
    healthData,
    syncLogs,
    anomalies,
    isLoading,
    error,
    refresh,
    acknowledgeAnomaly,
  };
}
