import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { logSync } from "../utils/logger";
import { requireEnv } from "../utils/env";
import { resolveUserId } from "../utils/userResolver";

const handler: Handler = async (event) => {
  try {
    const env = requireEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // Resolve user_id dynamically from auth or request body
    const body = event.body ? JSON.parse(event.body) : {};
    const userId = body.user_id || await resolveUserId(supabase);

    logSync("calc-trends:start", { userId });

    // Fetch all Fitbit activity data for this user, ordered by date
    const { data: activityData, error } = await supabase
      .from("fitbit_auto_data")
      .select("user_id, fetched_at, activity")
      .eq("user_id", userId)
      .order("fetched_at", { ascending: true });

    if (error) throw new Error(`Fetch error: ${error.message}`);
    if (!activityData || activityData.length === 0) {
      logSync("calc-trends:no-data", { userId });
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true, message: "No data to process", count: 0 }),
      };
    }

    logSync("calc-trends:fetched", { records: activityData.length });

    // Group data by date (extract YYYY-MM-DD from timestamp)
    const grouped: Record<string, any[]> = {};
    activityData.forEach((row) => {
      const date = row.fetched_at.split("T")[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(row);
    });

    // Calculate base metrics for each day
    const dailyMetrics: any[] = [];
    const dates = Object.keys(grouped).sort();

    dates.forEach((date) => {
      const entries = grouped[date];
      const activity = entries[0]?.activity?.data?.summary || {};
      
      // Extract base values with safe defaults
      const fairlyActive = activity.fairlyActiveMinutes || 0;
      const veryActive = activity.veryActiveMinutes || 0;
      const activeMinutes = fairlyActive + veryActive;
      const avgHR = activity.restingHeartRate || 70; // Use resting HR as proxy
      const restHR = activity.restingHeartRate || 60;
      
      // Heart rate zones for strain calculation
      const zones = activity.heartRateZones || [];
      const fatBurnMinutes = zones.find((z: any) => z.name === "Fat Burn")?.minutes || 0;
      const cardioMinutes = zones.find((z: any) => z.name === "Cardio")?.minutes || 0;
      const peakMinutes = zones.find((z: any) => z.name === "Peak")?.minutes || 0;

      // Calculate derived metrics
      const trainingLoad = activeMinutes > 0 ? (activeMinutes * avgHR) / 10 : 0;
      const hrv = 20 + (60 - restHR); // Recovery readiness proxy
      const strain = (fatBurnMinutes * 1.0) + (cardioMinutes * 1.5) + (peakMinutes * 2.0);

      dailyMetrics.push({
        date,
        user_id: userId,
        trainingLoad,
        hrv,
        strain,
      });
    });

    // Calculate rolling metrics (ACWR, EWMA, Monotony)
    const trends: any[] = [];
    
    for (let i = 0; i < dailyMetrics.length; i++) {
      const day = dailyMetrics[i];
      
      // Get last N days of training loads
      const loads7d = dailyMetrics.slice(Math.max(0, i - 6), i + 1).map(d => d.trainingLoad);
      const loads28d = dailyMetrics.slice(Math.max(0, i - 27), i + 1).map(d => d.trainingLoad);
      
      // ACWR: Acute (7d avg) / Chronic (28d avg)
      const acute = average(loads7d);
      const chronic = average(loads28d);
      const acwr = chronic > 0 ? acute / chronic : 0;
      
      // EWMA: Exponentially Weighted Moving Average
      const alpha = 2 / (7 + 1); // 0.25
      const prevEwma = i > 0 ? trends[i - 1].ewma : day.trainingLoad;
      const ewma = (alpha * day.trainingLoad) + ((1 - alpha) * prevEwma);
      
      // Monotony: mean / std dev of 7-day loads
      const mean = average(loads7d);
      const sd = standardDeviation(loads7d);
      const monotony = sd > 0.01 ? mean / sd : 0; // Avoid division by zero
      
      trends.push({
        user_id: day.user_id,
        date: day.date,
        training_load: day.trainingLoad,
        acute_load: acute,
        chronic_load: chronic,
        acwr: parseFloat(acwr.toFixed(2)),
        ewma: parseFloat(ewma.toFixed(2)),
        strain: parseFloat(day.strain.toFixed(2)),
        monotony: parseFloat(monotony.toFixed(2)),
        hrv: parseFloat(day.hrv.toFixed(2)),
      });
    }

    logSync("calc-trends:calculated", { trendRecords: trends.length });

    // Upsert trends into database (update if exists, insert if not)
    const { error: insertError } = await supabase
      .from("fitbit_trends")
      .upsert(trends, { onConflict: "user_id,date" });

    if (insertError) throw new Error(`Insert error: ${insertError.message}`);

    logSync("calc-trends:success", { records: trends.length });

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      body: JSON.stringify({
        ok: true,
        message: "Trends calculated successfully",
        count: trends.length,
      }),
    };
  } catch (e: any) {
    logSync("calc-trends:failed", { error: e.message });
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};

// Helper: Calculate average of array
function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Helper: Calculate standard deviation
function standardDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - mean, 2));
  return Math.sqrt(average(squareDiffs));
}

export { handler };
