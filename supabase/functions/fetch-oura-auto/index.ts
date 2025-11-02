import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OuraToken {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

interface OuraDataPoint {
  day: string;
  score?: number;
  contributors?: {
    activity_balance?: number;
    body_temperature?: number;
    hrv_balance?: number;
    previous_day_activity?: number;
    previous_night?: number;
    recovery_index?: number;
    resting_heart_rate?: number;
    sleep_balance?: number;
  };
  timestamp?: string;
}

interface OuraSleepData {
  id: string;
  day: string;
  score?: number;
  contributors?: {
    deep_sleep?: number;
    efficiency?: number;
    latency?: number;
    rem_sleep?: number;
    restfulness?: number;
    timing?: number;
    total_sleep?: number;
  };
  total_sleep_duration?: number;
  average_heart_rate?: number;
  average_hrv?: number;
  lowest_heart_rate?: number;
}

interface OuraActivityData {
  id: string;
  class_5_min?: string;
  score?: number;
  active_calories?: number;
  steps?: number;
  equivalent_walking_distance?: number;
  high_activity_time?: number;
  medium_activity_time?: number;
  low_activity_time?: number;
  rest_time?: number;
  day: string;
  timestamp?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if specific user_id provided (manual trigger)
    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id;

    console.log(`[fetch-oura-auto] Starting sync${targetUserId ? ` for user ${targetUserId}` : ' for all users'}`);

    // Get all users with Oura tokens (or specific user)
    let query = supabase
      .from("oura_tokens")
      .select("*");
    
    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: tokens, error: tokenError } = await query;

    if (tokenError) {
      console.error("[fetch-oura-auto] Error fetching tokens:", tokenError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens", details: tokenError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log("[fetch-oura-auto] No Oura tokens found");
      return new Response(
        JSON.stringify({ success: true, users_processed: 0, total_entries: 0, message: "No users with Oura tokens" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fetch-oura-auto] Found ${tokens.length} user(s) with Oura tokens`);

    let totalUsersProcessed = 0;
    let totalEntriesInserted = 0;

    // Process each user
    for (const token of tokens) {
      try {
        console.log(`[fetch-oura-auto] Processing user ${token.user_id}`);
        
        // Check if token is expired and refresh if needed
        let accessToken = token.access_token;
        if (new Date(token.expires_at) < new Date()) {
          console.log(`[fetch-oura-auto] Token expired for user ${token.user_id}, refreshing...`);
          
          const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: token.refresh_token,
              client_id: Deno.env.get("OURA_CLIENT_ID")!,
              client_secret: Deno.env.get("OURA_CLIENT_SECRET")!,
            }),
          });

          if (!refreshRes.ok) {
            const errorData = await refreshRes.json();
            console.error(`[fetch-oura-auto] Token refresh failed for user ${token.user_id}:`, errorData);
            
            await supabase.from("oura_logs").insert({
              user_id: token.user_id,
              status: "error",
              error_message: `Token refresh failed: ${JSON.stringify(errorData)}`,
            });
            continue;
          }

          const refreshed = await refreshRes.json();
          
          // Update token in database
          await supabase.from("oura_tokens").update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? token.refresh_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          }).eq("user_id", token.user_id);
          
          accessToken = refreshed.access_token;
          console.log(`[fetch-oura-auto] Token refreshed successfully for user ${token.user_id}`);
        }

        // Calculate date range (last 14 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);
        
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`[fetch-oura-auto] Fetching data from ${startDateStr} to ${endDateStr}`);

        // Fetch data from all three endpoints
        const endpoints = [
          { name: "daily_readiness", url: `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_sleep", url: `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_activity", url: `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDateStr}&end_date=${endDateStr}` },
        ];

        const fetchedData: Record<string, any> = {};
        
        for (const endpoint of endpoints) {
          const res = await fetch(endpoint.url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!res.ok) {
            console.error(`[fetch-oura-auto] Failed to fetch ${endpoint.name} for user ${token.user_id}: ${res.status}`);
            continue;
          }

          const data = await res.json();
          fetchedData[endpoint.name] = data.data || [];
          console.log(`[fetch-oura-auto] Fetched ${fetchedData[endpoint.name].length} entries from ${endpoint.name}`);
        }

        // Transform and store data
        const readinessData = fetchedData.daily_readiness || [];
        const sleepData = fetchedData.daily_sleep || [];
        const activityData = fetchedData.daily_activity || [];

        // Group by date for easier processing
        const dataByDate: Record<string, { readiness?: any; sleep?: any; activity?: any }> = {};

        readinessData.forEach((item: OuraDataPoint) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].readiness = item;
        });

        sleepData.forEach((item: OuraSleepData) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].sleep = item;
        });

        activityData.forEach((item: OuraActivityData) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].activity = item;
        });

        let entriesInserted = 0;

        // Insert into wearable_sessions
        for (const [date, dayData] of Object.entries(dataByDate)) {
          const sessionData = {
            user_id: token.user_id,
            date,
            source: "oura",
            readiness_score: dayData.readiness?.score || null,
            sleep_score: dayData.sleep?.score || null,
            activity_score: dayData.activity?.score || null,
            total_steps: dayData.activity?.steps || null,
            total_calories: dayData.activity?.active_calories || null,
            resting_hr: dayData.sleep?.lowest_heart_rate || dayData.sleep?.average_heart_rate || null,
            hrv_avg: dayData.sleep?.average_hrv || null,
            spo2_avg: null, // Oura doesn't provide this in daily endpoints
          };

          const { error: sessionError } = await supabase
            .from("wearable_sessions")
            .upsert(sessionData, {
              onConflict: "user_id,source,date",
            });

          if (sessionError) {
            console.error(`[fetch-oura-auto] Error inserting session for ${date}:`, sessionError);
          } else {
            entriesInserted++;
          }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // COMPUTE CALCULATED METRICS & STORE IN wearable_summary TABLE
        // ═══════════════════════════════════════════════════════════════════════════
        // This section calculates advanced training metrics that require historical data:
        // - Training Load: Combines intensity (activity score) with volume (steps)
        // - Strain: Cumulative training stress over 7 days
        // - Monotony: Training variety indicator (high = injury risk)
        // - ACWR: Acute:Chronic Workload Ratio (injury risk predictor)
        // - Readiness Index: 7-day average readiness
        // - Average Sleep Score: 7-day sleep quality average

        // Fetch 35 days of historical data (needed for 28-day chronic load calculation)
        const { data: historicalSessions } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", token.user_id)
          .eq("source", "oura")
          .gte("date", new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order("date", { ascending: true });

        if (historicalSessions && historicalSessions.length > 0) {
          // Calculate metrics for each date in the current sync batch
          for (const [date, dayData] of Object.entries(dataByDate)) {
            // ───────────────────────────────────────────────────────────────────────
            // 1. TRAINING LOAD CALCULATION
            // ───────────────────────────────────────────────────────────────────────
            // Formula: Training Load = Activity Score × (Steps / 10,000)
            //
            // Why this formula?
            // - Activity Score: Oura's 0-100 intensity metric (higher = more intense)
            // - Steps normalized to 10,000: Provides volume component
            // - Combined: Captures both intensity AND volume of training
            //
            // Examples:
            // - Easy day: 70 score × (8000 / 10000) = 56 load
            // - Hard day: 90 score × (15000 / 10000) = 135 load
            // - Rest day: 30 score × (2000 / 10000) = 6 load
            const activityScore = dayData.activity?.score || 0;
            const steps = dayData.activity?.steps || 0;
            const trainingLoad = activityScore * (steps / 10000);

            // Get last 7 days of data (inclusive of current date) for rolling calculations
            // Filtered to dates <= current date to enable historical recalculation
            const last7Days = historicalSessions
              .filter(s => s.date <= date)
              .slice(-7);

            // ───────────────────────────────────────────────────────────────────────
            // 2. TRAINING STRAIN CALCULATION
            // ───────────────────────────────────────────────────────────────────────
            // Formula: Strain = Sum of Training Loads over 7 days
            //
            // Purpose: Measures cumulative training stress
            //
            // Interpretation:
            // - < 500: Light training week
            // - 500-800: Moderate training week
            // - 800-1200: Heavy training week
            // - > 1200: Very heavy week (monitor closely)
            //
            // Example: [100, 110, 105, 95, 106, 108, 102] → Strain = 726
            const strain = last7Days.reduce((sum, s) => {
              const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
              return sum + load;
            }, 0);

            // ───────────────────────────────────────────────────────────────────────
            // 3. TRAINING MONOTONY CALCULATION
            // ───────────────────────────────────────────────────────────────────────
            // Only calculate if we have full 7 days of data
            if (last7Days.length >= 7) {
              // Recalculate training load for each of the 7 days
              const loads = last7Days.map(s => (s.activity_score || 0) * ((s.total_steps || 0) / 10000));

              // Calculate mean (average) training load
              const mean = loads.reduce((a, b) => a + b, 0) / loads.length;

              // Calculate variance: average of squared differences from mean
              // Variance measures how spread out the loads are
              const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;

              // Calculate standard deviation: square root of variance
              // Measures variability in training loads
              const std = Math.sqrt(variance);

              // Formula: Monotony = Mean / Standard Deviation
              //
              // Purpose: Detects lack of training variety
              //
              // Interpretation:
              // - < 15: Good variety (varying intensities and volumes)
              // - 15-25: Moderate variety
              // - > 25: High monotony (very similar training daily) → INJURY RISK
              //
              // Example:
              // Varied week: [50, 100, 80, 120, 60, 110, 90] → Low monotony (~12)
              // Monotonous week: [100, 105, 102, 98, 103, 101, 100] → High monotony (~50)
              //
              // Why it matters: Studies show high monotony + high strain = injury risk spike
              const monotony = std > 0 ? mean / std : 0;

              // ───────────────────────────────────────────────────────────────────────
              // 4. ACWR (ACUTE:CHRONIC WORKLOAD RATIO) CALCULATION
              // ───────────────────────────────────────────────────────────────────────
              // Get last 28 days of data for chronic load calculation
              const last28Days = historicalSessions
                .filter(s => s.date <= date)
                .slice(-28);

              let acwr = null;

              // Only calculate ACWR if we have sufficient data (28+ days)
              if (last28Days.length >= 28) {
                // ACUTE LOAD: Average training load over last 7 days
                // Represents recent training stress
                const acuteLoad = last7Days.reduce((sum, s) => {
                  const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
                  return sum + load;
                }, 0) / 7;

                // CHRONIC LOAD: Average training load over last 28 days (4 weeks)
                // Represents fitness/preparedness baseline
                const chronicLoad = last28Days.reduce((sum, s) => {
                  const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
                  return sum + load;
                }, 0) / 28;

                // Formula: ACWR = Acute Load / Chronic Load
                //
                // Purpose: Compares recent training to established fitness baseline
                //
                // Research-backed interpretation (Gabbett 2016):
                // - < 0.8: Undertraining (detraining, fitness loss)
                // - 0.8-1.3: OPTIMAL ZONE (lowest injury risk)
                // - 1.3-1.5: Elevated risk (monitor closely)
                // - > 1.5: HIGH INJURY RISK (acute spike without chronic fitness)
                //
                // Example:
                // - Acute: 110 (heavy week)
                // - Chronic: 100 (typical fitness)
                // - ACWR: 1.10 → Optimal zone (challenging but safe)
                //
                // - Acute: 150 (very heavy week)
                // - Chronic: 100 (typical fitness)
                // - ACWR: 1.50 → Dangerous spike (injury risk)
                acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;
              }

              // ───────────────────────────────────────────────────────────────────────
              // 5. READINESS & SLEEP AVERAGES
              // ───────────────────────────────────────────────────────────────────────
              // Calculate 7-day averages for trending/smoothing
              // These provide a more stable view of recovery status than single-day values
              const avgReadiness = last7Days.reduce((sum, s) => sum + (s.readiness_score || 0), 0) / last7Days.length;
              const avgSleep = last7Days.reduce((sum, s) => sum + (s.sleep_score || 0), 0) / last7Days.length;

              const summaryData = {
                user_id: token.user_id,
                date,
                source: "oura",
                strain: Math.round(strain * 100) / 100,
                monotony: Math.round(monotony * 100) / 100,
                acwr: acwr ? Math.round(acwr * 100) / 100 : null,
                readiness_index: Math.round(avgReadiness * 100) / 100,
                avg_sleep_score: Math.round(avgSleep * 100) / 100,
              };

              const { error: summaryError } = await supabase
                .from("wearable_summary")
                .upsert(summaryData, {
                  onConflict: "user_id,source,date",
                });

              if (summaryError) {
                console.error(`[fetch-oura-auto] Error inserting summary for ${date}:`, summaryError);
              }
            }
          }
        }

        totalEntriesInserted += entriesInserted;
        totalUsersProcessed++;

        // Log success
        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "success",
          entries_synced: entriesInserted,
        });

        console.log(`[fetch-oura-auto] Successfully processed ${entriesInserted} entries for user ${token.user_id}`);

      } catch (userError) {
        console.error(`[fetch-oura-auto] Error processing user ${token.user_id}:`, userError);
        
        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "error",
          error_message: userError instanceof Error ? userError.message : String(userError),
        });
      }
    }

    console.log(`[fetch-oura-auto] Completed. Processed ${totalUsersProcessed} users, inserted ${totalEntriesInserted} entries`);

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: totalUsersProcessed,
        total_entries: totalEntriesInserted,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[fetch-oura-auto] Fatal error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
