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

// Detailed sleep endpoint - contains HR and HRV time series
interface OuraSleepDetailed {
  id: string;
  day: string;
  average_heart_rate?: number;
  average_hrv?: number;
  lowest_heart_rate?: number;
  efficiency?: number;
  total_sleep_duration?: number;
  deep_sleep_duration?: number;
  light_sleep_duration?: number;
  rem_sleep_duration?: number;
  awake_time?: number;
  bedtime_start?: string;
  bedtime_end?: string;
}

// Daily sleep summary - score only
interface OuraDailySleep {
  id: string;
  day: string;
  score?: number;
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

// Heart rate time series data
interface OuraHeartRateData {
  bpm: number;
  source: string;
  timestamp: string;
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

    // Use shared token refresh utility with enhanced error handling
    const tokenResult = await getValidOuraToken(supabase, user_id);

    if (!tokenResult.success || !tokenResult.access_token) {
      const errorMessage = tokenResult.error || "Failed to get valid token";
      const errorCode = (tokenResult as any).error_code || "TOKEN_ERROR";
      
      console.error(`[fetch-oura-data] [ERROR] Token validation failed for user ${user_id}:`, {
        error: errorMessage,
        code: errorCode,
        refreshed: tokenResult.refreshed,
      });

      await supabase.from("oura_logs").insert({
        user_id,
        status: "error",
        error_message: `Token validation failed: ${errorMessage} (${errorCode})`,
      });

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          error_code: errorCode,
          success: false,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (tokenResult.refreshed) {
      console.log(`[fetch-oura-data] Token was refreshed for user ${user_id}`);
    }

    const accessToken = tokenResult.access_token;

    const endDate = end_date || new Date().toISOString().split('T')[0];
    const startDate = start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    console.log(`[fetch-oura-data] Fetching data from ${startDate} to ${endDate}`);

    // Convert dates to ISO datetime for heartrate endpoint
    const startDatetime = `${startDate}T00:00:00+00:00`;
    const endDatetime = `${endDate}T23:59:59+00:00`;

    // UPGRADED: Now includes detailed sleep endpoint and heartrate for HR/HRV data
    const endpoints = [
      { name: "daily_readiness", url: `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_sleep", url: `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_activity", url: `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_spo2", url: `https://api.ouraring.com/v2/usercollection/daily_spo2?start_date=${startDate}&end_date=${endDate}` },
      // CRITICAL: Detailed sleep endpoint contains actual HR and HRV values
      { name: "sleep", url: `https://api.ouraring.com/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}` },
      // High-resolution heartrate endpoint for resting HR calculation
      { name: "heartrate", url: `https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${encodeURIComponent(startDatetime)}&end_datetime=${encodeURIComponent(endDatetime)}` },
    ];

    const fetchedData: Record<string, any[]> = {};

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint.url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          console.error(`[fetch-oura-data] [ERROR] Failed to fetch ${endpoint.name}: HTTP ${res.status}`);

          if (res.status === 401) {
            await supabase.from("oura_logs").insert({
              user_id,
              status: "error",
              error_message: `Token invalid during API call (HTTP 401) at ${endpoint.name}`,
            });

            return new Response(
              JSON.stringify({ 
                error: "Oura token expired or invalid. Please reconnect your Oura Ring.",
                error_code: "TOKEN_EXPIRED",
                success: false,
              }),
              {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              }
            );
          }

          if (res.status === 429) {
            console.warn(`[fetch-oura-data] Rate limited on ${endpoint.name}, skipping...`);
          }

          fetchedData[endpoint.name] = [];
          continue;
        }

        const data = await res.json();
        fetchedData[endpoint.name] = data.data || [];
        console.log(`[fetch-oura-data] [SUCCESS] Fetched ${fetchedData[endpoint.name].length} entries from ${endpoint.name}`);
      } catch (fetchErr) {
        console.error(`[fetch-oura-data] [ERROR] Exception fetching ${endpoint.name}:`, fetchErr);
        fetchedData[endpoint.name] = [];
      }
    }

    const readinessData = fetchedData.daily_readiness || [];
    const dailySleepData = fetchedData.daily_sleep || [];
    const activityData = fetchedData.daily_activity || [];
    const spo2Data = fetchedData.daily_spo2 || [];
    const detailedSleepData = fetchedData.sleep || [];
    const heartrateData = fetchedData.heartrate || [];

    // Process heartrate data to get daily averages/resting HR
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

    // Aggregate data by date for consistent storage
    const dataByDate: Record<string, { 
      readiness?: OuraReadinessData; 
      dailySleep?: OuraDailySleep;
      sleepDetails?: OuraSleepDetailed;
      activity?: OuraActivityData;
      spo2?: OuraSpo2Data;
      hrData?: { avg: number; min: number };
    }> = {};

    readinessData.forEach((item: OuraReadinessData) => {
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
        user_id,
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

      console.log(`[fetch-oura-data] Date ${date}: resting_hr=${restingHr}, hrv_avg=${hrvAvg}`);

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
        }
      }
    }

    await supabase.from("oura_logs").insert({
      user_id,
      status: "success",
      entries_synced: entriesInserted,
    });

    console.log(`[fetch-oura-data] [SUCCESS] Processed ${entriesInserted} entries for user ${user_id}, HR/HRV populated: ${hrHrvPopulated}`);

    return new Response(
      JSON.stringify({
        success: true,
        entries_synced: entriesInserted,
        hr_hrv_populated: hrHrvPopulated,
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
