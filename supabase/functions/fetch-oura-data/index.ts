/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

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

interface RefreshResult {
  success: boolean;
  access_token?: string;
  error?: string;
}

async function refreshOuraToken(
  supabase: SupabaseClient,
  token: OuraToken
): Promise<RefreshResult> {
  try {
    console.log(`[oura-token-refresh] Refreshing token for user ${token.user_id}`);

    const clientId = Deno.env.get("OURA_CLIENT_ID");
    const clientSecret = Deno.env.get("OURA_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      throw new Error("Oura credentials not configured");
    }

    const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!refreshRes.ok) {
      const errorData = await refreshRes.json();
      console.error(`[oura-token-refresh] Refresh failed:`, errorData);
      return {
        success: false,
        error: `Token refresh failed: ${errorData.error_description || errorData.error}`,
      };
    }

    const refreshed = await refreshRes.json();

    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("oura_tokens")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? token.refresh_token,
        expires_at: expiresAt,
      })
      .eq("user_id", token.user_id);

    if (updateError) {
      console.error(`[oura-token-refresh] Database update failed:`, updateError);
      return {
        success: false,
        error: `Failed to save refreshed token: ${updateError.message}`,
      };
    }

    console.log(`[oura-token-refresh] Token refreshed successfully for user ${token.user_id}`);

    return {
      success: true,
      access_token: refreshed.access_token,
    };
  } catch (error) {
    console.error(`[oura-token-refresh] Unexpected error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function getValidOuraToken(
  supabase: SupabaseClient,
  userId: string
): Promise<{ success: boolean; access_token?: string; error?: string }> {
  const { data: token, error: tokenError } = await supabase
    .from("oura_tokens")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (tokenError || !token) {
    return {
      success: false,
      error: "No Oura token found. Please connect your Oura Ring first.",
    };
  }

  const expiresAt = new Date(token.expires_at);
  const now = new Date();

  if (expiresAt > now) {
    return {
      success: true,
      access_token: token.access_token,
    };
  }

  return await refreshOuraToken(supabase, token);
}

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
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[fetch-oura-data] Fetching data for user: ${user_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not available");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const tokenResult = await getValidOuraToken(supabase, user_id);

    if (!tokenResult.success || !tokenResult.access_token) {
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

    const endpoints = [
      { name: "daily_readiness", url: `https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_sleep", url: `https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}` },
      { name: "daily_activity", url: `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}` },
    ];

    const fetchedData: Record<string, any> = {};

    for (const endpoint of endpoints) {
      const res = await fetch(endpoint.url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        console.error(`[fetch-oura-data] Failed to fetch ${endpoint.name}: ${res.status}`);

        if (res.status === 401) {
          return new Response(
            JSON.stringify({ error: "Oura token expired or invalid. Please reconnect your Oura Ring." }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }

        continue;
      }

      const data = await res.json();
      fetchedData[endpoint.name] = data.data || [];
      console.log(`[fetch-oura-data] Fetched ${fetchedData[endpoint.name].length} entries from ${endpoint.name}`);
    }

    const readinessData = fetchedData.daily_readiness || [];
    const sleepData = fetchedData.daily_sleep || [];
    const activityData = fetchedData.daily_activity || [];

    const dataByDate: Record<string, { readiness?: OuraReadinessData; sleep?: OuraSleepData; activity?: OuraActivityData }> = {};

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

    let entriesInserted = 0;

    for (const [date, dayData] of Object.entries(dataByDate)) {
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
        spo2_avg: null,
      };

      const { error: sessionError } = await supabase
        .from("wearable_sessions")
        .upsert(sessionData, {
          onConflict: "user_id,source,date",
        });

      if (sessionError) {
        console.error(`[fetch-oura-data] Error inserting session for ${date}:`, sessionError);
      } else {
        entriesInserted++;
      }

      // Also save detailed activity data to oura_activity table if available
      if (dayData.activity) {
        const activityData = {
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
          .upsert(activityData, {
            onConflict: "user_id,oura_id",
          });

        if (activityError) {
          console.error(`[fetch-oura-data] Error inserting activity data for ${date}:`, activityError);
        } else {
          console.log(`[fetch-oura-data] Saved activity data for ${date}: ${activityData.active_calories || 0} active cals, ${activityData.total_calories || 0} total cals, ${activityData.steps || 0} steps`);
        }
      }
    }

    await supabase.from("oura_logs").insert({
      user_id,
      status: "success",
      entries_synced: entriesInserted,
    });

    console.log(`[fetch-oura-data] Successfully processed ${entriesInserted} entries for user ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        entries_synced: entriesInserted,
        start_date: startDate,
        end_date: endDate,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[fetch-oura-data] Error:", error);

    const message = error instanceof Error ? error.message : "Internal server error";

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});