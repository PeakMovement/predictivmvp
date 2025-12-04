/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

    console.log(`[fetch-oura-auto] [START] Starting sync${targetUserId ? ` for user ${targetUserId}` : " for all users"}`);

    let query = supabase.from("oura_tokens").select("*");
    
    if (targetUserId) {
      query = query.eq("user_id", targetUserId);
    }

    const { data: tokens, error: tokenError } = await query;

    if (tokenError) {
      console.error("[fetch-oura-auto] [ERROR] Failed to fetch tokens from database:", tokenError);
      console.error("[fetch-oura-auto] [DEBUG] Token error details:", JSON.stringify(tokenError));
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
    const fetchedEndpoints: string[] = [];
    let lastSyncDate = 'today';

    for (const token of tokens) {
      try {
        console.log(`[fetch-oura-auto] Processing user ${token.user_id}`);

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
            console.error(`[fetch-oura-auto] [ERROR] Token refresh failed for user ${token.user_id}`);
            console.error(`[fetch-oura-auto] [DEBUG] Refresh error details:`, JSON.stringify(errorData));
            console.error(`[fetch-oura-auto] [DEBUG] HTTP Status: ${refreshRes.status}`);

            await supabase.from("oura_logs").insert({
              user_id: token.user_id,
              status: "error",
              error_message: `Token refresh failed: ${JSON.stringify(errorData)}`,
            });
            continue;
          }

          const refreshed = await refreshRes.json();
          
          await supabase.from("oura_tokens").update({
            access_token: refreshed.access_token,
            refresh_token: refreshed.refresh_token ?? token.refresh_token,
            expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          }).eq("user_id", token.user_id);
          
          accessToken = refreshed.access_token;
          console.log(`[fetch-oura-auto] Token refreshed successfully for user ${token.user_id}`);
        }

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 14);

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

          // Additional health metrics
          { name: "daily_spo2", url: `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_stress", url: `https://api.ouraring.com/v2/usercollection/daily_stress?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_resilience", url: `https://api.ouraring.com/v2/usercollection/daily_resilience?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "daily_cardiovascular_age", url: `https://api.ouraring.com/v2/usercollection/daily_cardiovascular_age?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "vo2_max", url: `https://api.ouraring.com/v2/usercollection/vO2_max?start_date=${startDateStr}&end_date=${endDateStr}` },

          // Detailed data
          { name: "sleep", url: `https://api.ouraring.com/v2/usercollection/sleep?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "workout", url: `https://api.ouraring.com/v2/usercollection/workout?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "session", url: `https://api.ouraring.com/v2/usercollection/session?start_date=${startDateStr}&end_date=${endDateStr}` },
          { name: "tag", url: `https://api.ouraring.com/v2/usercollection/tag?start_date=${startDateStr}&end_date=${endDateStr}` },
        ];

        const fetchedData: Record<string, any> = {};

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
              console.error(`[fetch-oura-auto] [ERROR] Failed to fetch ${endpoint.name} for user ${token.user_id}`);
              console.error(`[fetch-oura-auto] [DEBUG] HTTP Status: ${res.status}`);
              console.error(`[fetch-oura-auto] [DEBUG] Endpoint URL: ${currentUrl}`);

              await supabase.from("oura_logs").insert({
                user_id: token.user_id,
                status: "error",
                error_message: `Failed to fetch ${endpoint.name}: HTTP ${res.status}`,
              });
              break;
            }

            const data = await res.json();
            const pageData = data.data || [];
            allData = allData.concat(pageData);

            // Check for pagination token
            if (data.next_token) {
              // Add next_token to URL for next page
              const url = new URL(currentUrl);
              url.searchParams.set("next_token", data.next_token);
              currentUrl = url.toString();
              console.log(`[fetch-oura-auto] Fetching next page for ${endpoint.name}...`);
            } else {
              hasMore = false;
            }
          }

          fetchedData[endpoint.name] = allData;
          console.log(`[fetch-oura-auto] Fetched ${allData.length} total entries from ${endpoint.name}`);

          // Track successfully fetched endpoints
          if (allData.length > 0 && !fetchedEndpoints.includes(endpoint.name)) {
            fetchedEndpoints.push(endpoint.name);
          }
        }

        const readinessData = fetchedData.daily_readiness || [];
        const sleepData = fetchedData.daily_sleep || [];
        const activityData = fetchedData.daily_activity || [];

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
            hrv: dayData.sleep?.average_hrv || null,
            spo2_avg: null,
          };

          const { error: sessionError } = await supabase
            .from("wearable_sessions")
            .upsert(sessionData, {
              onConflict: "user_id,source,date",
            });

          if (sessionError) {
            console.error(`[fetch-oura-auto] [ERROR] Failed to insert session for ${date}`);
            console.error(`[fetch-oura-auto] [DEBUG] Session error details:`, JSON.stringify(sessionError));
            console.error(`[fetch-oura-auto] [DEBUG] Session data:`, JSON.stringify(sessionData));
          } else {
            entriesInserted++;
            console.log(`[fetch-oura-auto] [SUCCESS] Inserted session for ${date}`);
          }
        }

        const { data: historicalSessions } = await supabase
          .from("wearable_sessions")
          .select("*")
          .eq("user_id", token.user_id)
          .eq("source", "oura")
          .gte("date", new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
          .order("date", { ascending: true });

        if (historicalSessions && historicalSessions.length > 0) {
          for (const [date, dayData] of Object.entries(dataByDate)) {
            const activityScore = dayData.activity?.score || 0;
            const steps = dayData.activity?.steps || 0;
            const trainingLoad = activityScore * (steps / 10000);

            const last7Days = historicalSessions
              .filter(s => s.date <= date)
              .slice(-7);

            const strain = last7Days.reduce((sum, s) => {
              const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
              return sum + load;
            }, 0);

            if (last7Days.length >= 7) {
              const loads = last7Days.map(s => (s.activity_score || 0) * ((s.total_steps || 0) / 10000));
              const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
              const variance = loads.reduce((sum, load) => sum + Math.pow(load - mean, 2), 0) / loads.length;
              const std = Math.sqrt(variance);
              const monotony = std > 0 ? mean / std : 0;

              const last28Days = historicalSessions
                .filter(s => s.date <= date)
                .slice(-28);

              let acwr = null;

              if (last28Days.length >= 28) {
                const acuteLoad = last7Days.reduce((sum, s) => {
                  const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
                  return sum + load;
                }, 0) / 7;

                const chronicLoad = last28Days.reduce((sum, s) => {
                  const load = (s.activity_score || 0) * ((s.total_steps || 0) / 10000);
                  return sum + load;
                }, 0) / 28;

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
                console.error(`[fetch-oura-auto] [ERROR] Failed to insert summary for ${date}`);
                console.error(`[fetch-oura-auto] [DEBUG] Summary error details:`, JSON.stringify(summaryError));
                console.error(`[fetch-oura-auto] [DEBUG] Summary data:`, JSON.stringify(summaryData));
              } else {
                console.log(`[fetch-oura-auto] [SUCCESS] Inserted summary for ${date}`);
              }
            }
          }
        }

        totalEntriesInserted += entriesInserted;
        totalUsersProcessed++;

        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "success",
          entries_synced: entriesInserted,
        });

        console.log(`[fetch-oura-auto] [SUCCESS] Completed processing for user ${token.user_id}: ${entriesInserted} entries synced`);

      } catch (userError) {
        console.error(`[fetch-oura-auto] [ERROR] Failed to process user ${token.user_id}`);
        console.error(`[fetch-oura-auto] [DEBUG] Error message:`, userError instanceof Error ? userError.message : String(userError));
        console.error(`[fetch-oura-auto] [DEBUG] Error stack:`, userError instanceof Error ? userError.stack : 'No stack trace');

        await supabase.from("oura_logs").insert({
          user_id: token.user_id,
          status: "error",
          error_message: userError instanceof Error ? userError.message : String(userError),
        });
      }
    }

    console.log(`[fetch-oura-auto] [COMPLETE] Sync finished: ${totalUsersProcessed} users processed, ${totalEntriesInserted} total entries synced`);

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: totalUsersProcessed,
        total_entries: totalEntriesInserted,
        fetched_endpoints: fetchedEndpoints,
        date: lastSyncDate,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[fetch-oura-auto] [FATAL] Unhandled error in main execution");
    console.error("[fetch-oura-auto] [DEBUG] Fatal error message:", err instanceof Error ? err.message : String(err));
    console.error("[fetch-oura-auto] [DEBUG] Fatal error stack:", err instanceof Error ? err.stack : 'No stack trace');
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
