/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidOuraToken } from "../_shared/oura-token-refresh.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OuraDataPoint {
  day: string;
  score?: number;
  contributors?: any;
  timestamp?: string;
}

// Detailed sleep endpoint - contains HR and HRV data
interface OuraSleepDetailed {
  id: string;
  day: string;
  average_heart_rate?: number;
  average_hrv?: number;
  lowest_heart_rate?: number;
  efficiency?: number;
  total_sleep_duration?: number;
}

interface OuraDailySleep {
  id: string;
  day: string;
  score?: number;
}

interface OuraActivityData {
  id: string;
  class_5_min?: string;
  score?: number;
  active_calories?: number;
  total_calories?: number;
  steps?: number;
  equivalent_walking_distance?: number;
  day: string;
}

interface OuraSpo2Data {
  id: string;
  day: string;
  spo2_percentage?: {
    average?: number;
  };
}

interface OuraHeartRateData {
  bpm: number;
  source: string;
  timestamp: string;
}

interface DayData {
  readiness?: OuraDataPoint;
  dailySleep?: OuraDailySleep;
  sleepDetails?: OuraSleepDetailed;
  activity?: OuraActivityData;
  spo2?: OuraSpo2Data;
  hrData?: { avg: number; min: number };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[fetch-oura-auto] [ERROR] Supabase credentials not available");
      throw new Error("Supabase credentials not available");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const targetUserId = body.user_id;


    // Query wearable_tokens directly, filter by Oura scope (extapi)
    let query = supabase.from("wearable_tokens").select("*").ilike("scope", "%extapi%");
    
    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: tokens, error: tokenError } = await query;

    if (tokenError) {
      console.error("[fetch-oura-auto] [ERROR] Failed to fetch tokens from database:", tokenError.message);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens", details: tokenError.message, success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, users_processed: 0, total_entries: 0, message: "No users with Oura tokens" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    let totalUsersProcessed = 0;
    let totalEntriesInserted = 0;
    let totalTrendsInserted = 0;
    let totalHrHrvPopulated = 0;
    const fetchedEndpoints: string[] = [];
    let lastSyncDate = 'today';

    for (const token of tokens) {
      try {

        // Use shared token refresh utility with enhanced error handling
        const tokenResult = await getValidOuraToken(supabase, token.user_id);

        if (!tokenResult.success || !tokenResult.access_token) {
          const errorCode = (tokenResult as any).error_code || "TOKEN_ERROR";
          console.error(`[fetch-oura-auto] [ERROR] Token validation failed for user ${token.user_id}:`, {
            error: tokenResult.error,
            code: errorCode,
          });
          
          await supabase.from("oura_logs").insert({
            user_id: token.user_id,
            status: "error",
            error_message: `Token validation failed: ${tokenResult.error} (${errorCode})`,
          });
          continue;
        }

        if (tokenResult.refreshed) {
        }

        const accessToken = tokenResult.access_token;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Fetch 30 days for trend calculations

        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];
        lastSyncDate = endDateStr;

        // Convert dates to ISO datetime for heartrate endpoint
        const startDatetime = `${startDateStr}T00:00:00+00:00`;
        const endDatetime = `${endDateStr}T23:59:59+00:00`;


        // PHASE 3 UPGRADE: Now includes detailed sleep and heartrate endpoints for HR/HRV data
        const endpoints = [
          // Daily summaries - core metrics
          { name: "daily_readiness", url: `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_sleep", url: `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_activity", url: `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_spo2", url: `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${startDateStr}&end_date=${endDateStr}` },
          // CRITICAL: Detailed sleep endpoint contains actual HR and HRV values
          { name: "sleep", url: `https://api.ouraring.com/v2/usercollection/sleep?start_date=${startDateStr}&end_date=${endDateStr}` },
          // High-resolution heartrate endpoint for resting HR calculation
          { name: "heartrate", url: `https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${encodeURIComponent(startDatetime)}&end_datetime=${encodeURIComponent(endDatetime)}` },
        ];

        const fetchedData: Record<string, any[]> = {};

        // Fetch data from all endpoints with pagination support
        for (const endpoint of endpoints) {
          let allData: any[] = [];
          let currentUrl = endpoint.url;
          let hasMore = true;

          // Handle pagination with next_token
          while (hasMore) {
            const res = await fetch(currentUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (!res.ok) {
              // Don't log error for optional endpoints that may return 403/404
              if (res.status !== 403 && res.status !== 404) {
                console.error(`[fetch-oura-auto] [ERROR] Failed to fetch ${endpoint.name} for user ${token.user_id}: HTTP ${res.status}`);
              }
              break;
            }

            const data = await res.json();
            const pageData = data.data || [];
            allData = allData.concat(pageData);

            // Check for pagination token
            if (data.next_token) {
              const url = new URL(currentUrl);
              url.searchParams.set("next_token", data.next_token);
              currentUrl = url.toString();
            } else {
              hasMore = false;
            }
          }

          fetchedData[endpoint.name] = allData;

          // Track successfully fetched endpoints
          if (allData.length > 0) {
            if (!fetchedEndpoints.includes(endpoint.name)) {
              fetchedEndpoints.push(endpoint.name);
            }
          }
        }

        const readinessData = fetchedData.daily_readiness || [];
        const dailySleepData = fetchedData.daily_sleep || [];
        const activityData = fetchedData.daily_activity || [];
        const spo2Data = fetchedData.daily_spo2 || [];
        const detailedSleepData = fetchedData.sleep || [];
        const heartrateData = fetchedData.heartrate || [];

        // Process heartrate data to get daily resting HR
        const hrByDate: Record<string, { total: number; count: number; min: number }> = {};
        for (const hr of heartrateData as OuraHeartRateData[]) {
          const date = hr.timestamp?.split('T')[0];
          if (date && hr.bpm > 0) {
            if (!hrByDate[date]) {
              hrByDate[date] = { total: 0, count: 0, min: 999 };
            }
            hrByDate[date].total += hr.bpm;
            hrByDate[date].count++;
            if (hr.bpm < hrByDate[date].min) {
              hrByDate[date].min = hr.bpm;
            }
          }
        }

        // Process detailed sleep data to get HR and HRV by date
        const sleepDetailsByDate: Record<string, OuraSleepDetailed> = {};
        for (const sleep of detailedSleepData as OuraSleepDetailed[]) {
          const date = sleep.day;
          // Use the longest sleep period for each day (primary sleep)
          if (!sleepDetailsByDate[date] || 
              (sleep.total_sleep_duration || 0) > (sleepDetailsByDate[date].total_sleep_duration || 0)) {
            sleepDetailsByDate[date] = sleep;
          }
        }

        // Aggregate data by date
        const dataByDate: Record<string, DayData> = {};

        readinessData.forEach((item: OuraDataPoint) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].readiness = item;
        });

        dailySleepData.forEach((item: OuraDailySleep) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].dailySleep = item;
        });

        activityData.forEach((item: OuraActivityData) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].activity = item;
        });

        spo2Data.forEach((item: OuraSpo2Data) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].spo2 = item;
        });

        // Add detailed sleep data
        for (const [date, sleepDetails] of Object.entries(sleepDetailsByDate)) {
          if (!dataByDate[date]) dataByDate[date] = {};
          dataByDate[date].sleepDetails = sleepDetails;
        }

        // Add HR data
        for (const [date, hrInfo] of Object.entries(hrByDate)) {
          if (!dataByDate[date]) dataByDate[date] = {};
          dataByDate[date].hrData = {
            avg: Math.round(hrInfo.total / hrInfo.count),
            min: hrInfo.min < 999 ? hrInfo.min : 0,
          };
        }

        let entriesInserted = 0;
        let hrHrvPopulated = 0;

        // Insert wearable sessions (idempotent via onConflict)
        for (const [date, dayData] of Object.entries(dataByDate)) {
          // Priority for HR: detailed sleep (lowest_heart_rate) > heartrate endpoint (min) > heartrate endpoint (avg)
          const restingHr = dayData.sleepDetails?.lowest_heart_rate 
            || dayData.hrData?.min 
            || dayData.hrData?.avg 
            || null;

          // HRV comes from detailed sleep endpoint
          const hrvAvg = dayData.sleepDetails?.average_hrv || null;

          if (restingHr || hrvAvg) {
            hrHrvPopulated++;
          }

          const sessionData = {
            user_id: token.user_id,
            date,
            source: "oura",
            readiness_score: dayData.readiness?.score || null,
            sleep_score: dayData.dailySleep?.score || null,
            activity_score: dayData.activity?.score || null,
            total_steps: dayData.activity?.steps || null,
            active_calories: dayData.activity?.active_calories || null,
            total_calories: dayData.activity?.total_calories || null,
            resting_hr: restingHr,
            hrv_avg: hrvAvg,
            spo2_avg: dayData.spo2?.spo2_percentage?.average || null,
          };

          const { error: sessionError } = await supabase
            .from("wearable_sessions")
            .upsert(sessionData, {
              onConflict: "user_id,source,date",
            });

          if (sessionError) {
            console.error(`[fetch-oura-auto] [ERROR] Failed to insert session for ${date}:`, sessionError.message);
          } else {
            entriesInserted++;
          }
        }

        // Fetch historical sessions for trend calculations
        const { data: historicalSessions } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", token.user_id)
          .eq("source", "oura")
          .gte("date", new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          .order("date", { ascending: true });

        // Calculate and insert trends to training_trends table
        let trendsInserted = 0;
        if (historicalSessions && historicalSessions.length >= 7) {
          const sortedDates = Object.keys(dataByDate).sort();

          for (const date of sortedDates) {
            const dayData = dataByDate[date];
            
            // Get sessions up to this date
            const sessionsUpToDate = historicalSessions.filter(s => s.date <= date);
            const last7Days = sessionsUpToDate.slice(-7);
            const last28Days = sessionsUpToDate.slice(-28);

            if (last7Days.length < 7) continue;

            // Calculate training load (activity score * normalized steps)
            // Fallback: use activity score directly if steps data is missing
            const calculateLoad = (s: any) => {
              const actScore = s.activity_score || 0;
              const steps = s.total_steps || 0;
              if (steps === 0 && actScore > 0) {
                return actScore; // Fallback: use raw activity score when steps missing
              }
              return actScore * (steps / 10000);
            };

            // Acute load (7-day average)
            const acuteLoad = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0) / 7;

            // Chronic load (28-day average, if available)
            let chronicLoad = null;
            let acwr = null;
            if (last28Days.length >= 28) {
              chronicLoad = last28Days.reduce((sum, s) => sum + calculateLoad(s), 0) / 28;
              acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;
            }

            // Strain (7-day total load) - CAPPED at 2000 max
            const rawStrain = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0);
            const strain = Math.min(rawStrain, 2000);

            // Monotony (mean / std deviation of 7-day loads) - CAPPED at 2.5 max
            const loads = last7Days.map(calculateLoad);
            const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
            const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
            const std = Math.sqrt(variance);
            const rawMonotony = std > 0 ? mean / std : 0;
            const monotony = Math.min(rawMonotony, 2.5);
            

            // HRV and sleep score from current day's detailed sleep
            const hrv = dayData.sleepDetails?.average_hrv || null;
            const sleepScore = dayData.dailySleep?.score || null;

            // Training load for today
            const trainingLoad = calculateLoad({
              activity_score: dayData.activity?.score || 0,
              total_steps: dayData.activity?.steps || 0,
            });

            // Insert to training_trends table
            const trendData = {
              user_id: token.user_id,
              date,
              training_load: Math.round(trainingLoad * 100) / 100,
              acute_load: Math.round(acuteLoad * 100) / 100,
              chronic_load: chronicLoad ? Math.round(chronicLoad * 100) / 100 : null,
              acwr: acwr ? Math.round(acwr * 100) / 100 : null,
              strain: Math.round(strain * 100) / 100,
              monotony: Math.round(monotony * 100) / 100,
              hrv: hrv,
              sleep_score: sleepScore,
            };

            const { error: trendError } = await supabase
              .from("training_trends")
              .upsert(trendData, {
                onConflict: "user_id,date",
              });

            if (trendError) {
              console.error(`[fetch-oura-auto] [ERROR] Failed to insert trend for ${date}:`, trendError.message);
            } else {
              trendsInserted++;
            }
          }
        }

        // Also update wearable_summary for backward compatibility
        if (historicalSessions && historicalSessions.length >= 7) {
          for (const [date, dayData] of Object.entries(dataByDate)) {
            const sessionsUpToDate = historicalSessions.filter(s => s.date <= date);
            const last7Days = sessionsUpToDate.slice(-7);
            const last28Days = sessionsUpToDate.slice(-28);

            if (last7Days.length < 7) continue;

            // Fallback: use activity score directly if steps data is missing
            const calculateLoad = (s: any) => {
              const actScore = s.activity_score || 0;
              const steps = s.total_steps || 0;
              if (steps === 0 && actScore > 0) {
                return actScore;
              }
              return actScore * (steps / 10000);
            };

            // Strain and monotony with caps
            const rawStrain = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0);
            const strain = Math.min(rawStrain, 2000);
            const loads = last7Days.map(calculateLoad);
            const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
            const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
            const std = Math.sqrt(variance);
            const rawMonotony = std > 0 ? mean / std : 0;
            const monotony = Math.min(rawMonotony, 2.5);

            let acwr = null;
            if (last28Days.length >= 28) {
              const acuteLoad = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0) / 7;
              const chronicLoad = last28Days.reduce((sum, s) => sum + calculateLoad(s), 0) / 28;
              acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : null;
            }

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
              console.error(`[fetch-oura-auto] [ERROR] Failed to insert summary for ${date}:`, summaryError.message);
            }
          }
        }

        totalEntriesInserted += entriesInserted;
        totalTrendsInserted += trendsInserted;
        totalHrHrvPopulated += hrHrvPopulated;
        totalUsersProcessed++;

        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "success",
          entries_synced: entriesInserted,
        });


      } catch (userError) {
        console.error(`[fetch-oura-auto] [ERROR] Failed to process user ${token.user_id}:`, userError instanceof Error ? userError.message : String(userError));

        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "error",
          error_message: userError instanceof Error ? userError.message : String(userError),
        });
      }
    }


    // Trigger comprehensive trend calculations after sync
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (supabaseUrl && serviceKey) {
        const trendResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-oura-trends`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${serviceKey}`,
          },
          body: JSON.stringify(targetUserId ? { user_id: targetUserId } : {}),
        });

        if (trendResponse.ok) {
        } else {
          console.error("[fetch-oura-auto] [WARNING] Failed to trigger calculate-oura-trends:", trendResponse.status);
        }
      }
    } catch (trendError) {
      console.error("[fetch-oura-auto] [WARNING] Could not trigger trend calculation:", trendError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: totalUsersProcessed,
        total_entries: totalEntriesInserted,
        total_trends: totalTrendsInserted,
        hr_hrv_populated: totalHrHrvPopulated,
        fetched_endpoints: fetchedEndpoints,
        date: lastSyncDate,
        trend_calculation_triggered: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[fetch-oura-auto] [FATAL] Unhandled error:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
