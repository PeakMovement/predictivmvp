import { createClient } from "@supabase/supabase-js";

export const handler = async (event) => {
  console.log("🔄 Fitbit token exchange started (REST version)");

  try {
    const { code } = JSON.parse(event.body || "{}");
    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing Fitbit authorization code" }),
      };
    }

    const FITBIT_CLIENT_ID = process.env.FITBIT_CLIENT_ID || "23TG3N";
    const FITBIT_CLIENT_SECRET = process.env.FITBIT_CLIENT_SECRET;
    const SUPABASE_URL = process.env.SB_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SB_SERVICE_ROLE_KEY;

    const authHeader = btoa(`${FITBIT_CLIENT_ID}:${FITBIT_CLIENT_SECRET}`);
    const tokenResponse = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${authHeader}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: FITBIT_CLIENT_ID,
        grant_type: "authorization_code",
        redirect_uri: "https://predictiv.netlify.app/fitbit/callback",
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("✅ Token data received from Fitbit:", tokenData);

    if (!tokenResponse.ok) {
      console.error("❌ Fitbit token exchange failed:", tokenData);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: tokenData }),
      };
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Insert token data into fitbit_auto_data table
    const { data, error } = await supabase
      .from("fitbit_auto_data")
      .insert({
        user_id: tokenData.user_id || "test_user_01",
        activity: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          token_type: tokenData.token_type,
        },
        fetched_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error("❌ Supabase insert error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to save tokens to Supabase", details: error }),
      };
    }

    console.log("✅ Successfully saved to Supabase fitbit_auto_data:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Fitbit tokens saved successfully", 
        user_id: tokenData.user_id,
        saved: true 
      }),
    };

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error" }),
    };
  }
};
