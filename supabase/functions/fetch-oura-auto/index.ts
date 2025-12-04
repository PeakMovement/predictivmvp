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

interface OuraSleepData {
  id: string;
  day: string;
  score?: number;
  contributors?: any;
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
  total_calories?: number;
  steps?: number;
  equivalent_walking_distance?: number;
  high_activity_time?: number;
  medium_activity_time?: number;
  low_activity_time?: number;
  rest_time?: number;
  day: string;
  timestamp?: string;
}

interface OuraSpo2Data {
  id: string;
  day: string;
  spo2_percentage?: {
    average?: number;
  };
  breathing_disturbance_index?: number;
}

interface DayData {
  readiness?: OuraDataPoint;
  sleep?: OuraSleepData;
  activity?: OuraActivityData;
  spo2?: OuraSpo2Data;
}

// Add retry delay helper for rate limits
async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Rate limit handler with exponential backoff
async function fetchWithRetry(
  url: string,
  accessToken: string,
  maxRetries = 3
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Handle rate limiting with backoff
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10);
        console.log(`[fetch-oura-auto] Rate limited, waiting ${retryAfter}s...`);
        await delay(retryAfter * 1000);
        continue;
      }

      return res;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await delay(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
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

    console.log(`[fetch-oura-auto] [START] Starting sync${targetUserId ? ` for user ${targetUserId}` : " for all users"}`);

    let query = supabase.from("oura_tokens").select("*");
    
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
      console.log("[fetch-oura-auto] No Oura tokens found");
      return new Response(
        JSON.stringify({ success: true, users_processed: 0, total_entries: 0, message: "No users with Oura tokens" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[fetch-oura-auto] Found ${tokens.length} user(s) with Oura tokens`);

    let totalUsersProcessed = 0;
    let totalEntriesInserted = 0;
    let totalTrendsInserted = 0;
    const fetchedEndpoints: string[] = [];
    let lastSyncDate = 'today';

    for (const token of tokens) {
      try {
        console.log(`[fetch-oura-auto] Processing user ${token.user_id}`);

        // Use shared token refresh utility
        const tokenResult = await getValidOuraToken(supabase, token.user_id);

        if (!tokenResult.success || !tokenResult.access_token) {
          console.error(`[fetch-oura-auto] [ERROR] Token validation failed for user ${token.user_id}: ${tokenResult.error}`);
          await supabase.from("oura_logs").insert({
            user_id: token.user_id,
            status: "error",
            error_message: `Token validation failed: ${tokenResult.error}`,
          });
          continue;
        }

        const accessToken = tokenResult.access_token;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Fetch 30 days for trend calculations

        const startDateStr = startDate.toISOString().split("T")[0];
        const endDateStr = endDate.toISOString().split("T")[0];
        lastSyncDate = endDateStr;

        console.log(`[fetch-oura-auto] Fetching data from ${startDateStr} to ${endDateStr}`);

        // Comprehensive Oura API endpoints per official documentation
        const endpoints = [
          // Daily summaries - core metrics
          { name: "daily_readiness", url: `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_sleep", url: `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_activity", url: `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_spo2", url: `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${startDateStr}&end_date=${endDateStr}` },

          // Additional health metrics (optional, may not be available for all users)
          { name: "daily_stress", url: `https://api.ouraring.com/v2/usercollection/daily_stress?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_resilience", url: `https://api.ouraring.com/v2/usercollection/daily_resilience?start_date=${startDateStr}&end_date=${endDateStr}` },

          // Detailed data
          { name: "workout", url: `https://api.ouraring.com/v2/usercollection/workout?start_date=${startDateStr}&end_date=${endDateStr}` },
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
              console.log(`[fetch-oura-auto] Fetching next page for ${endpoint.name}...`);
            } else {
              hasMore = false;
            }
          }

          fetchedData[endpoint.name] = allData;

          // Track successfully fetched endpoints
          if (allData.length > 0) {
            console.log(`[fetch-oura-auto] [SUCCESS] Fetched ${allData.length} entries from ${endpoint.name}`);
            if (!fetchedEndpoints.includes(endpoint.name)) {
              fetchedEndpoints.push(endpoint.name);
            }
          }
        }

        const readinessData = fetchedData.daily_readiness || [];
        const sleepData = fetchedData.daily_sleep || [];
        const activityData = fetchedData.daily_activity || [];
        const spo2Data = fetchedData.daily_spo2 || [];

        // Aggregate data by date
        const dataByDate: Record<string, DayData> = {};

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

        spo2Data.forEach((item: OuraSpo2Data) => {
          if (!dataByDate[item.day]) dataByDate[item.day] = {};
          dataByDate[item.day].spo2 = item;
        });

        let entriesInserted = 0;

        // Insert wearable sessions (idempotent via onConflict)
        for (const [date, dayData] of Object.entries(dataByDate)) {
          const sessionData = {
            user_id: token.user_id,
            date,
            source: "oura",
            readiness_score: dayData.readiness?.score || null,
            sleep_score: dayData.sleep?.score || null,
            activity_score: dayData.activity?.score || null,
            total_steps: dayData.activity?.steps || null,
            active_calories: dayData.activity?.active_calories || null,
            total_calories: dayData.activity?.total_calories || null,
            resting_hr: dayData.sleep?.lowest_heart_rate || dayData.sleep?.average_heart_rate || null,
            hrv_avg: dayData.sleep?.average_hrv || null,
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
            const calculateLoad = (s: any) => {
              const actScore = s.activity_score || 0;
              const steps = s.total_steps || 0;
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

            // Strain (7-day total load)
            const strain = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0);

            // Monotony (mean / std deviation of 7-day loads)
            const loads = last7Days.map(calculateLoad);
            const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
            const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
            const std = Math.sqrt(variance);
            const monotony = std > 0 ? mean / std : 0;

            // HRV and sleep score from current day
            const hrv = dayData.sleep?.average_hrv || null;
            const sleepScore = dayData.sleep?.score || null;

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

            const calculateLoad = (s: any) => (s.activity_score || 0) * ((s.total_steps || 0) / 10000);

            const strain = last7Days.reduce((sum, s) => sum + calculateLoad(s), 0);
            const loads = last7Days.map(calculateLoad);
            const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
            const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
            const std = Math.sqrt(variance);
            const monotony = std > 0 ? mean / std : 0;

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
        totalUsersProcessed++;

        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "success",
          entries_synced: entriesInserted,
        });

        console.log(`[fetch-oura-auto] [SUCCESS] Completed user ${token.user_id}: ${entriesInserted} sessions, ${trendsInserted} trends`);

      } catch (userError) {
        console.error(`[fetch-oura-auto] [ERROR] Failed to process user ${token.user_id}:`, userError instanceof Error ? userError.message : String(userError));

        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "error",
          error_message: userError instanceof Error ? userError.message : String(userError),
        });
      }
    }

    console.log(`[fetch-oura-auto] [COMPLETE] Sync finished: ${totalUsersProcessed} users, ${totalEntriesInserted} sessions, ${totalTrendsInserted} trends`);

    // Trigger comprehensive trend calculations after sync
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      
      if (supabaseUrl && anonKey) {
        const trendResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-oura-trends`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${anonKey}`,
          },
          body: JSON.stringify(targetUserId ? { user_id: targetUserId } : {}),
        });

        if (trendResponse.ok) {
          console.log("[fetch-oura-auto] [SUCCESS] Triggered calculate-oura-trends");
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