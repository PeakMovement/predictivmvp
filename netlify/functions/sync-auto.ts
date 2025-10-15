import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { logSync } from "../utils/logger";
import { requireEnv } from "../utils/env";

const handler: Handler = async (event) => {
  try {
    // Validate base environment variables
    const env = requireEnv();
    
    // Check for access token
    const FITBIT_ACCESS_TOKEN = process.env.FITBIT_ACCESS_TOKEN;
    if (!FITBIT_ACCESS_TOKEN) {
      throw new Error("Missing FITBIT_ACCESS_TOKEN environment variable");
    }

    // Fetch today's activity data from Fitbit
    logSync("fitbit:sync-auto:start", { user_id: "CTBNRR" });
    
    const response = await fetch(
      "https://api.fitbit.com/1/user/-/activities/date/today.json",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FITBIT_ACCESS_TOKEN}`,
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

    // Store in Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE);
    
    const { error: dbError } = await supabase
      .from("fitbit_auto_data")
      .insert({
        user_id: "CTBNRR",
        activity: activityData,
        fetched_at: new Date().toISOString(),
      });

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
