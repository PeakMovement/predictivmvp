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

    const FITBIT_CLIENT_ID = Deno.env.get("FITBIT_CLIENT_ID") || "23TG3N";
    const FITBIT_CLIENT_SECRET = Deno.env.get("FITBIT_CLIENT_SECRET");
    const SUPABASE_URL = Deno.env.get("SB_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_ROLE_KEY");

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
    console.log("✅ Fitbit token response:", tokenData);

    if (!tokenResponse.ok) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: tokenData }),
      };
    }

    const supabaseInsert = await fetch(`${SUPABASE_URL}/rest/v1/fitbit_tokens`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        user_id: "test_user_01",
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        fetched_at: new Date().toISOString(),
      }),
    });

    const result = await supabaseInsert.json();
    console.log("✅ Saved to Supabase:", result);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Fitbit tokens saved successfully", tokenData }),
    };

  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || "Unknown error" }),
    };
  }
};
