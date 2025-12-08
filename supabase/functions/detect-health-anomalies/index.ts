/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface AnomalyThreshold {
  metric: string;
  spikePercent: number;
  dropPercent: number;
  criticalSpikePercent: number;
  criticalDropPercent: number;
}

// Physiological anomaly thresholds based on health research
const ANOMALY_THRESHOLDS: AnomalyThreshold[] = [
  { metric: "hrv_avg", spikePercent: 40, dropPercent: 30, criticalSpikePercent: 60, criticalDropPercent: 50 },
  { metric: "resting_hr", spikePercent: 20, dropPercent: 15, criticalSpikePercent: 35, criticalDropPercent: 25 },
  { metric: "sleep_score", spikePercent: 25, dropPercent: 25, criticalSpikePercent: 40, criticalDropPercent: 40 },
  { metric: "readiness_score", spikePercent: 25, dropPercent: 25, criticalSpikePercent: 40, criticalDropPercent: 40 },
  { metric: "activity_score", spikePercent: 50, dropPercent: 40, criticalSpikePercent: 80, criticalDropPercent: 60 },
];

function determineSeverity(
  deviationPercent: number, 
  threshold: AnomalyThreshold, 
  anomalyType: "spike" | "drop"
): "low" | "medium" | "high" | "critical" {
  const absDeviation = Math.abs(deviationPercent);
  
  if (anomalyType === "spike") {
    if (absDeviation >= threshold.criticalSpikePercent) return "critical";
    if (absDeviation >= threshold.spikePercent * 1.5) return "high";
    if (absDeviation >= threshold.spikePercent) return "medium";
    return "low";
  } else {
    if (absDeviation >= threshold.criticalDropPercent) return "critical";
    if (absDeviation >= threshold.dropPercent * 1.5) return "high";
    if (absDeviation >= threshold.dropPercent) return "medium";
    return "low";
  }
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
    const targetUserId = body.user_id;

    console.log(`[detect-anomalies] [START] ${targetUserId ? `User: ${targetUserId}` : "All users"}`);

    // Get users with recent wearable data
    let userQuery = supabase.from("wearable_tokens").select("user_id").ilike("scope", "%extapi%");
    if (targetUserId) {
      userQuery = userQuery.eq("user_id", targetUserId);
    }

    const { data: users, error: userError } = await userQuery;
    if (userError) throw new Error(`Failed to fetch users: ${userError.message}`);

    if (!users || users.length === 0) {
      console.log("[detect-anomalies] No users with Oura tokens found");
      return new Response(
        JSON.stringify({ success: true, anomalies_detected: 0, message: "No users to process" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalAnomalies = 0;
    const anomalyResults: any[] = [];

    for (const user of users) {
      console.log(`[detect-anomalies] Processing user ${user.user_id}`);

      // Get last 14 days of data for baseline calculation
      const { data: sessions, error: sessionError } = await supabase
        .from("wearable_sessions")
        .select("date, hrv_avg, resting_hr, sleep_score, readiness_score, activity_score")
        .eq("user_id", user.user_id)
        .eq("source", "oura")
        .gte("date", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (sessionError || !sessions || sessions.length < 3) {
        console.log(`[detect-anomalies] Insufficient data for user ${user.user_id}`);
        continue;
      }

      // Calculate baselines (7-day rolling average, excluding most recent day)
      const baselineSessions = sessions.slice(0, -1);
      const latestSession = sessions[sessions.length - 1];

      const baselines: Record<string, number> = {};
      for (const metric of ["hrv_avg", "resting_hr", "sleep_score", "readiness_score", "activity_score"]) {
        const values = baselineSessions
          .map(s => s[metric as keyof typeof s] as number | null)
          .filter((v): v is number => v !== null && !isNaN(v));
        
        if (values.length >= 3) {
          baselines[metric] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      }

      // Detect anomalies in latest session
      for (const threshold of ANOMALY_THRESHOLDS) {
        const currentValue = latestSession[threshold.metric as keyof typeof latestSession] as number | null;
        const baselineValue = baselines[threshold.metric];

        if (currentValue === null || currentValue === undefined || !baselineValue) {
          continue;
        }

        const deviationPercent = ((currentValue - baselineValue) / baselineValue) * 100;
        let anomalyType: "spike" | "drop" | null = null;

        if (deviationPercent >= threshold.spikePercent) {
          anomalyType = "spike";
        } else if (deviationPercent <= -threshold.dropPercent) {
          anomalyType = "drop";
        }

        if (anomalyType) {
          const severity = determineSeverity(deviationPercent, threshold, anomalyType);
          
          // Check if same anomaly already exists for today
          const { data: existing } = await supabase
            .from("health_anomalies")
            .select("id")
            .eq("user_id", user.user_id)
            .eq("metric_name", threshold.metric)
            .gte("detected_at", latestSession.date)
            .maybeSingle();

          if (!existing) {
            const { error: insertError } = await supabase.from("health_anomalies").insert({
              user_id: user.user_id,
              metric_name: threshold.metric,
              anomaly_type: anomalyType,
              severity,
              current_value: currentValue,
              baseline_value: baselineValue,
              deviation_percent: Math.round(deviationPercent * 10) / 10,
              notes: `${threshold.metric} ${anomalyType}: ${currentValue.toFixed(1)} vs baseline ${baselineValue.toFixed(1)} (${deviationPercent > 0 ? '+' : ''}${deviationPercent.toFixed(1)}%)`,
            });

            if (!insertError) {
              totalAnomalies++;
              anomalyResults.push({
                user_id: user.user_id,
                metric: threshold.metric,
                type: anomalyType,
                severity,
                deviation: `${deviationPercent > 0 ? '+' : ''}${deviationPercent.toFixed(1)}%`,
              });
              
              console.log(`[detect-anomalies] Detected ${severity} ${anomalyType} in ${threshold.metric} for user ${user.user_id}: ${deviationPercent.toFixed(1)}%`);
            }
          }
        }
      }

      // Check for missing data (plateau/missing anomaly)
      const nullMetrics = ["hrv_avg", "resting_hr", "sleep_score"].filter(
        m => latestSession[m as keyof typeof latestSession] === null
      );

      for (const metric of nullMetrics) {
        const { data: existing } = await supabase
          .from("health_anomalies")
          .select("id")
          .eq("user_id", user.user_id)
          .eq("metric_name", metric)
          .eq("anomaly_type", "missing")
          .gte("detected_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existing) {
          await supabase.from("health_anomalies").insert({
            user_id: user.user_id,
            metric_name: metric,
            anomaly_type: "missing",
            severity: "medium",
            notes: `${metric} data missing for ${latestSession.date}`,
          });
          totalAnomalies++;
        }
      }
    }

    console.log(`[detect-anomalies] [COMPLETE] Detected ${totalAnomalies} anomalies across ${users.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: users.length,
        anomalies_detected: totalAnomalies,
        details: anomalyResults,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[detect-anomalies] [ERROR]", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
