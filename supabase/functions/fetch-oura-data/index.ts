/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidOuraToken } from "../_shared/oura-token-refresh.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OuraDataRequest {
  user_id: string;
  start_date?: string;
  end_date?: string;
}

interface OuraSleepData {
  id: string;
  day: string;
  score?: number;
  total_sleep_duration?: number;
  average_heart_rate?: number;
  average_hrv?: number;
  lowest_heart_rate?: number;
}

interface OuraReadinessData {
  id: string;
  day: string;
  score?: number;
}

interface OuraActivityData {
  id: string;
  day: string;
  score?: number;
  steps?: number;
  active_calories?: number;
  total_calories?: number;
  equivalent_walking_distance?: number;
}

interface OuraSpo2Data {
  id: string;
  day: string;
  spo2_percentage?: {
    average?: number;
  };
  breathing_disturbance_index?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { user_id, start_date, end_date } = await req.json() as OuraDataRequest;

    if (!user_id) {
      console.error("[fetch-oura-data] [ERROR] Missing user_id in request");
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[fetch-oura-data] [START] Fetching data for user: ${user_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[fetch-oura-data] [ERROR] Supabase credentials not available");
      throw new Error("Supabase credentials not available");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use shared token refresh utility
    const tokenResult = await getValidOuraToken(supabase, user_id);

    if (!tokenResult.success || !tokenResult.access_token) {
      console.error(`[fetch-oura-data] [ERROR] Token validation failed for user ${user_id}: ${tokenResult.error}`);
      return new Response(
        JSON.stringify({ error: tokenResult.error || "Failed to get valid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const accessToken = tokenResult.access_token;

    const endDate = end_date || new Date().toISOString().split('T')[0];
    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[fetch-oura-data] Fetching data from ${startDate} to ${endDate}`);

    // All core Oura endpoints for comprehensive data sync
    const endpoints = [
      { name: "daily_readiness", url: `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_sleep", url: `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_activity", url: `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_spo2", url: `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${startDate}&end_date=${endDate}` },
    ];

    const fetchedData: Record<string, any[]> = {};

    for (const endpoint of endpoints) {
      const res = await fetch(endpoint.url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.error(`[fetch-oura-data] [ERROR] Failed to fetch ${endpoint.name}: HTTP ${res.status}`);

        if (res.status === 401) {
          return new Response(
            JSON.stringify({ error: "Oura token expired or invalid. Please reconnect your Oura Ring." }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }

        fetchedData[endpoint.name] = [];
        continue;
      }

      const data = await res.json();
      fetchedData[endpoint.name] = data.data || [];
      console.log(`[fetch-oura-data] [SUCCESS] Fetched ${fetchedData[endpoint.name].length} entries from ${endpoint.name}`);
    }

    const readinessData = fetchedData.daily_readiness || [];
    const sleepData = fetchedData.daily_sleep || [];
    const activityData = fetchedData.daily_activity || [];
    const spo2Data = fetchedData.daily_spo2 || [];

    // Aggregate data by date for consistent storage
    const dataByDate: Record<string, { 
      readiness?: OuraReadinessData; 
      sleep?: OuraSleepData; 
      activity?: OuraActivityData;
      spo2?: OuraSpo2Data;
    }> = {};

    readinessData.forEach((item: OuraReadinessData) => {
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

    for (const [date, dayData] of Object.entries(dataByDate)) {
      // Upsert to wearable_sessions (idempotent via onConflict)
      const sessionData = {
        user_id,
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
        console.error(`[fetch-oura-data] [ERROR] Failed to insert session for ${date}:`, sessionError.message);
      } else {
        entriesInserted++;
      }

      // Save detailed activity data to oura_activity table if available
      if (dayData.activity) {
        const activityDataRecord = {
          user_id,
          oura_id: dayData.activity.id,
          day: date,
          score: dayData.activity.score || null,
          active_calories: dayData.activity.active_calories || null,
          total_calories: dayData.activity.total_calories || null,
          steps: dayData.activity.steps || null,
          equivalent_walking_distance: dayData.activity.equivalent_walking_distance || null,
          raw_data: dayData.activity,
        };

        const { error: activityError } = await supabase
          .from("oura_activity")
          .upsert(activityDataRecord, {
            onConflict: "user_id,oura_id",
          });

        if (activityError) {
          console.error(`[fetch-oura-data] [ERROR] Failed to insert activity data for ${date}:`, activityError.message);
        } else {
          console.log(`[fetch-oura-data] [SUCCESS] Saved activity for ${date}: ${activityDataRecord.steps || 0} steps, ${activityDataRecord.active_calories || 0} active cals`);
        }
      }
    }

    await supabase.from("oura_logs").insert({
      user_id,
      status: "success",
      entries_synced: entriesInserted,
    });

    console.log(`[fetch-oura-data] [SUCCESS] Processed ${entriesInserted} entries for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        entries_synced: entriesInserted,
        start_date: startDate,
        end_date: endDate,
        endpoints_synced: Object.keys(fetchedData).filter(k => fetchedData[k].length > 0),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[fetch-oura-data] [ERROR] Unhandled exception:", error instanceof Error ? error.message : String(error));

    const message = error instanceof Error ? error.message : "Internal server error";

    return new Response(
      JSON.stringify({ error: message, success: false }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});