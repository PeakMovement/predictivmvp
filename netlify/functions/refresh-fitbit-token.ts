import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import { logSync } from "../utils/logger";
import { requireEnv } from "../utils/env";

const handler: Handler = async (event) => {
  try {
    // Validate base environment variables
    const env = requireEnv();
    
    // Check for refresh token
    const FITBIT_REFRESH_TOKEN = process.env.FITBIT_REFRESH_TOKEN;
    if (!FITBIT_REFRESH_TOKEN) {
      throw new Error("Missing FITBIT_REFRESH_TOKEN environment variable");
    }

    // Prepare Basic Auth header
    const credentials = Buffer.from(
      `${env.FITBIT_CLIENT_ID}:${env.FITBIT_CLIENT_SECRET}`
    ).toString("base64");

    // Prepare request body
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: FITBIT_REFRESH_TOKEN,
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
    const { access_token, refresh_token, user_id } = data;

    // Log success
    logSync("fitbit:refresh", {
      new_access_token: access_token?.substring(0, 10) + "...",
      user_id,
    });

    // Store tokens in Supabase
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { error: dbError } = await supabase
      .from("fitbit_auto_data")
      .upsert({
        user_id: user_id,
        activity: {
          tokens: {
            access_token,
            refresh_token,
            refreshed_at: new Date().toISOString(),
          }
        },
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
      body: JSON.stringify({
        ok: true,
        message: "Fitbit tokens refreshed",
      }),
    };
  } catch (e: any) {
    logSync("fitbit:refresh:failed", { error: e.message });
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to refresh Fitbit tokens",
        details: e.message,
      }),
    };
  }
};

export { handler };
