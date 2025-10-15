import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { logSync } from "../utils/logger";
import { requireEnv } from "../utils/env";

const handler: Handler = async (event) => {
  try {
    // Validate base environment variables
    const env = requireEnv();
    const userId = "CTBNRR"; // TODO: Make dynamic based on authenticated user
    
    logSync("fitbit:sync-auto:start", { user_id: userId });

    // Get valid access token (auto-refreshes if expired)
    const { getValidToken } = await import("../utils/tokenManager");
    const accessToken = await getValidToken(userId);
    
    // Fetch today's activity data from Fitbit (use proper date format)
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const response = await fetch(
      `https://api.fitbit.com/1/user/-/activities/date/${today}.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logSync("fitbit:sync-auto:api-error", {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Fitbit API error: ${response.status} - ${errorText}`);
    }

    const activityData = await response.json();
    
    logSync("fitbit:sync-auto:data-received", {
      has_summary: !!activityData.summary,
      steps: activityData.summary?.steps,
      calories: activityData.summary?.caloriesOut,
    });

    // Fetch sleep data from Fitbit
    const sleepResponse = await fetch(
      `https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    let sleepData = null;
    if (sleepResponse.ok) {
      sleepData = await sleepResponse.json();
      logSync("fitbit:sync-auto:sleep-data-received", {
        has_sleep: !!sleepData.sleep && sleepData.sleep.length > 0,
        sleep_records: sleepData.sleep?.length || 0,
      });
    } else {
      logSync("fitbit:sync-auto:sleep-data-unavailable", {
        status: sleepResponse.status,
      });
    }

    // Store in Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Check if today's data already exists
    const todayDate = new Date().toISOString().split('T')[0];
    const { data: existingData } = await supabase
      .from("fitbit_auto_data")
      .select("id, activity")
      .eq("user_id", userId)
      .gte("fetched_at", `${todayDate}T00:00:00`)
      .lte("fetched_at", `${todayDate}T23:59:59`)
      .single();

    // Prepare activity and sleep data - properly separate tokens and data
    const existingTokens = existingData ? (existingData.activity as any)?.tokens : null;
    const mergedActivity = {
      tokens: existingTokens || {},
      data: activityData,
      synced_at: new Date().toISOString(),
    };

    const mergedSleep = sleepData ? {
      data: sleepData,
      synced_at: new Date().toISOString(),
    } : null;

    let dbError;
    if (existingData) {
      // Update existing record with both activity and sleep
      const updateData: any = {
        activity: mergedActivity,
        fetched_at: new Date().toISOString(),
      };
      if (mergedSleep) {
        updateData.sleep = mergedSleep;
      }
      const { error } = await supabase
        .from("fitbit_auto_data")
        .update(updateData)
        .eq("id", existingData.id);
      dbError = error;
    } else {
      // Insert new record with both activity and sleep
      const insertData: any = {
        user_id: userId,
        activity: mergedActivity,
        fetched_at: new Date().toISOString(),
      };
      if (mergedSleep) {
        insertData.sleep = mergedSleep;
      }
      const { error } = await supabase
        .from("fitbit_auto_data")
        .insert(insertData);
      dbError = error;
    }

    if (dbError) {
      logSync("fitbit:sync-auto:db-error", { error: dbError.message });
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Success
    logSync("fitbit:sync-auto:success", { 
      user_id: "CTBNRR",
      timestamp: new Date().toISOString(),
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: "Fitbit auto-sync complete",
        data: {
          steps: activityData.summary?.steps,
          calories: activityData.summary?.caloriesOut,
          synced_at: new Date().toISOString(),
        },
      }),
    };
  } catch (e: any) {
    logSync("fitbit:sync-auto:failed", { error: e.message });
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: e.message,
      }),
    };
  }
};

export { handler };
