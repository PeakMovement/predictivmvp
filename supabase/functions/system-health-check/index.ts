/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface HealthMetrics {
  sync_success_rate: number;
  avg_latency_ms: number;
  rate_limited_count: number;
  error_count: number;
  retry_queue_pending: number;
  anomalies_unacknowledged: number;
  tokens_expiring_soon: number;
  last_sync_time: string | null;
  data_freshness_hours: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not available");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json().catch(() => ({}));
    const hoursWindow = body.hours || 24;


    const windowStart = new Date(Date.now() - hoursWindow * 60 * 60 * 1000).toISOString();

    // Get sync health stats
    const { data: syncStats, error: syncError } = await supabase
      .from("sync_health_log")
      .select("status, latency_ms")
      .gte("created_at", windowStart);

    if (syncError) throw new Error(`Failed to fetch sync stats: ${syncError.message}`);

    const totalSyncs = syncStats?.length || 0;
    const successSyncs = syncStats?.filter(s => s.status === "success").length || 0;
    const rateLimitedCount = syncStats?.filter(s => s.status === "rate_limited").length || 0;
    const errorCount = syncStats?.filter(s => s.status === "error").length || 0;
    const avgLatency = totalSyncs > 0 
      ? Math.round(syncStats!.reduce((sum, s) => sum + (s.latency_ms || 0), 0) / totalSyncs)
      : 0;
    const successRate = totalSyncs > 0 ? Math.round((successSyncs / totalSyncs) * 100) : 100;

    // Get retry queue stats
    const { count: retryPending } = await supabase
      .from("sync_retry_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    // Get unacknowledged anomalies
    const { count: anomaliesUnack } = await supabase
      .from("health_anomalies")
      .select("*", { count: "exact", head: true })
      .is("acknowledged_at", null)
      .gte("detected_at", windowStart);

    // Get tokens expiring within 1 hour
    const soonExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { count: tokensExpiring } = await supabase
      .from("wearable_tokens")
      .select("*", { count: "exact", head: true })
      .lte("expires_at", soonExpiry)
      .ilike("scope", "%extapi%");

    // Get last successful sync time
    const { data: lastSync } = await supabase
      .from("oura_logs")
      .select("created_at")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Calculate data freshness
    let dataFreshnessHours: number | null = null;
    if (lastSync?.created_at) {
      const lastSyncTime = new Date(lastSync.created_at);
      dataFreshnessHours = Math.round((Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60) * 10) / 10;
    }

    const metrics: HealthMetrics = {
      sync_success_rate: successRate,
      avg_latency_ms: avgLatency,
      rate_limited_count: rateLimitedCount,
      error_count: errorCount,
      retry_queue_pending: retryPending || 0,
      anomalies_unacknowledged: anomaliesUnack || 0,
      tokens_expiring_soon: tokensExpiring || 0,
      last_sync_time: lastSync?.created_at || null,
      data_freshness_hours: dataFreshnessHours,
    };

    // Determine overall health status
    let healthStatus: "healthy" | "degraded" | "critical" = "healthy";
    const issues: string[] = [];

    if (successRate < 95) {
      healthStatus = successRate < 80 ? "critical" : "degraded";
      issues.push(`Low sync success rate: ${successRate}%`);
    }

    if (avgLatency > 5000) {
      healthStatus = avgLatency > 10000 ? "critical" : "degraded";
      issues.push(`High average latency: ${avgLatency}ms`);
    }

    if (rateLimitedCount > 5) {
      healthStatus = "degraded";
      issues.push(`Rate limiting detected: ${rateLimitedCount} occurrences`);
    }

    if ((retryPending || 0) > 10) {
      healthStatus = "degraded";
      issues.push(`Retry queue backlog: ${retryPending} pending`);
    }

    if (dataFreshnessHours && dataFreshnessHours > 2) {
      healthStatus = dataFreshnessHours > 6 ? "critical" : "degraded";
      issues.push(`Data staleness: ${dataFreshnessHours} hours since last sync`);
    }


    return new Response(
      JSON.stringify({
        status: healthStatus,
        metrics,
        issues,
        checked_at: new Date().toISOString(),
        window_hours: hoursWindow,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[system-health] [ERROR]", error);
    return new Response(
      JSON.stringify({ 
        status: "critical",
        error: error instanceof Error ? error.message : "Unknown error",
        checked_at: new Date().toISOString(),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
