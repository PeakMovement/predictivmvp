import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { logSync } from "../utils/logger";
import { requireEnv } from "../utils/env";

const handler: Handler = async (event) => {
  try {
    // Validate base environment variables
    const env = requireEnv();
    const userId = "CTBNRR"; // TODO: Make dynamic based on authenticated user
    
    // Fetch refresh token from database
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: tokenData, error: fetchError } = await supabase
      .from("fitbit_auto_data")
      .select("activity")
      .eq("user_id", userId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !tokenData) {
      throw new Error("No refresh token found in database");
    }

    const refreshToken = (tokenData.activity as any)?.tokens?.refresh_token;
    if (!refreshToken) {
      throw new Error("No refresh token found in database");
    }

    // Prepare Basic Auth header
    const credentials = Buffer.from(
      `${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`
    ).toString("base64");

    // Prepare request body
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    // Request new tokens from Fitbit
    const response = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logSync("fitbit:refresh:error", {
        status: response.status,
        error: errorText,
      });
      throw new Error(`Fitbit API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const { access_token, refresh_token: new_refresh_token, user_id, expires_in } = data;

    // Log success
    logSync("fitbit:refresh", {
      new_access_token: access_token?.substring(0, 10) + "...",
      user_id,
    });

    // Fetch existing record to preserve activity data
    const { data: existingRecord } = await supabase
      .from("fitbit_auto_data")
      .select("activity")
      .eq("user_id", user_id || userId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .single();

    const existingActivityData = existingRecord ? (existingRecord.activity as any)?.data : null;
    
    // Merge tokens with existing activity data
    const mergedActivity = {
      tokens: {
        access_token,
        refresh_token: new_refresh_token,
        expires_in: expires_in || 28800,
        refreshed_at: new Date().toISOString(),
      },
      ...(existingActivityData && { data: existingActivityData })
    };

    const { error: dbError } = await supabase
      .from("fitbit_auto_data")
      .upsert({
        user_id: user_id || userId,
        activity: mergedActivity,
        fetched_at: new Date().toISOString(),
      });

    if (dbError) {
      logSync("fitbit:refresh:db_error", { error: dbError.message });
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Trigger auto-sync in the background (non-blocking)
    logSync("fitbit:refresh:trigger-sync", { message: "🔄 Starting post-refresh auto-sync..." });
    
    // Fire-and-forget fetch call - don't await to avoid blocking the response
    const baseUrl = process.env.URL || 'https://predictiv.netlify.app';
    fetch(`${baseUrl}/.netlify/functions/sync-auto`)
      .then((syncResponse) => {
        if (syncResponse.ok) {
          logSync("fitbit:refresh:sync-success", { 
            message: "✅ Auto-sync triggered successfully",
            status: syncResponse.status 
          });
        } else {
          logSync("fitbit:refresh:sync-warning", { 
            message: "⚠️ Auto-sync trigger failed",
            status: syncResponse.status 
          });
        }
      })
      .catch((syncError) => {
        logSync("fitbit:refresh:sync-error", { 
          message: "⚠️ Auto-sync trigger failed",
          error: syncError.message 
        });
      });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true,
        message: "Fitbit tokens refreshed",
      }),
    };
  } catch (e: any) {
    logSync("fitbit:refresh:failed", { error: e.message });
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Failed to refresh Fitbit tokens",
        details: e.message,
      }),
    };
  }
};

export { handler };
