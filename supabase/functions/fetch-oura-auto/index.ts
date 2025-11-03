import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    console.log(`[fetch-oura-auto] Starting sync${targetUserId ? ` for user ${targetUserId}` : " for all users"}`);

    let query = supabase.from("oura_tokens").select("*");
    
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
            console.error(`[fetch-oura-auto] Token refresh failed for user ${token.user_id}:`, errorData);
            
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

        console.log(`[fetch-oura-auto] Fetching data from ${startDateStr} to ${endDateStr}`);

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
            total_calories: dayData.activity?.active_calories || null,
            resting_hr: dayData.sleep?.lowest_heart_rate || dayData.sleep?.average_heart_rate || null,
            hrv_avg: dayData.sleep?.average_hrv || null,
            spo2_avg: null,
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
                console.error(`[fetch-oura-auto] Error inserting summary for ${date}:`, summaryError);
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