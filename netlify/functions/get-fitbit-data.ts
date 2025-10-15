import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { logSync } from "../utils/logger";
import { requireEnv } from "../utils/env";

const handler: Handler = async (event) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Validate environment variables
    const env = requireEnv();
    
    // Get query parameters
    const params = event.queryStringParameters || {};
    const userId = params.user_id || "CTBNRR"; // Default user ID
    const days = parseInt(params.days || "7"); // Default to last 7 days
    
    logSync("fitbit:get-data:start", { userId, days });

    // Create Supabase client
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Fetch data from Supabase
    const { data, error } = await supabase
      .from("fitbit_auto_data")
      .select("*")
      .eq("user_id", userId)
      .gte("fetched_at", startDate.toISOString())
      .lte("fetched_at", endDate.toISOString())
      .order("fetched_at", { ascending: false });

    if (error) {
      logSync("fitbit:get-data:db-error", { error: error.message });
      throw new Error(`Database error: ${error.message}`);
    }

    // Process and format the data
    const formattedData = data.map((entry: any) => {
      const activityData = entry.activity?.data || entry.activity;
      const summary = activityData?.summary || {};
      
      // Extract sleep data if available
      const sleepData = entry.sleep?.data?.sleep?.[0]; // Get main sleep
      const sleepSummary = entry.sleep?.data?.summary;
      
      return {
        id: entry.id,
        user_id: entry.user_id,
        fetched_at: entry.fetched_at,
        
        // Activity metrics
        steps: summary.steps || 0,
        calories: summary.caloriesOut || 0,
        activityCalories: summary.activityCalories || 0,
        distance: summary.distances?.[0]?.distance || 0,
        floors: summary.floors || 0,
        elevation: summary.elevation || 0,
        activeMinutes: (summary.fairlyActiveMinutes || 0) + (summary.veryActiveMinutes || 0),
        sedentaryMinutes: summary.sedentaryMinutes || 0,
        lightlyActiveMinutes: summary.lightlyActiveMinutes || 0,
        fairlyActiveMinutes: summary.fairlyActiveMinutes || 0,
        veryActiveMinutes: summary.veryActiveMinutes || 0,
        
        // Heart rate metrics
        restingHeartRate: summary.restingHeartRate || 0,
        heartRateZones: summary.heartRateZones || [],
        
        // Sleep metrics
        sleepDuration: sleepData?.minutesAsleep || 0,
        sleepEfficiency: sleepData?.efficiency || 0,
        sleepStartTime: sleepData?.startTime || null,
        sleepEndTime: sleepData?.endTime || null,
        deepSleepMinutes: sleepData?.levels?.summary?.deep?.minutes || 0,
        lightSleepMinutes: sleepData?.levels?.summary?.light?.minutes || 0,
        remSleepMinutes: sleepData?.levels?.summary?.rem?.minutes || 0,
        awakeSleepMinutes: sleepData?.levels?.summary?.wake?.minutes || 0,
        
        raw_data: {
          activity: activityData,
          sleep: sleepData,
        },
      };
    });

    logSync("fitbit:get-data:success", { 
      records: formattedData.length,
      dateRange: { start: startDate.toISOString(), end: endDate.toISOString() }
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: true,
        data: formattedData,
        meta: {
          user_id: userId,
          days_requested: days,
          records_returned: formattedData.length,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          }
        }
      }),
    };
  } catch (e: any) {
    logSync("fitbit:get-data:failed", { error: e.message });
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ok: false,
        error: e.message,
      }),
    };
  }
};

export { handler };
