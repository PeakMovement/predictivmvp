import { createClient } from "@supabase/supabase-js";

interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  user_id?: string;
}

export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" },
      body: "",
    };
  }

  if (event.httpMethod !== "POST" && !(event.queryStringParameters && event.queryStringParameters.debug === "1")) {
    return { 
      statusCode: 405, 
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Method not allowed" }) 
    };
  }

  try {
    // Validate environment variables first
    const clientIdRaw = process.env.FITBIT_CLIENT_ID;
    const clientSecretRaw = process.env.FITBIT_CLIENT_SECRET;
    const redirectUriRaw = process.env.FITBIT_REDIRECT_URI;
    
    const clientId = (clientIdRaw || "").trim();
    const clientSecret = (clientSecretRaw || "").trim();
    const redirectUri = (redirectUriRaw || "").trim();

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("❌ Missing Fitbit environment variables");
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // Check if clientSecret looks like a URL (common misconfiguration)
    const looksLikeUrl = (v?: string) => !!v && /^https?:\/\//i.test(v);
    if (looksLikeUrl(clientSecret) || (clientSecret && clientSecret.includes("supabase.co"))) {
      console.error("❌ FITBIT_CLIENT_SECRET appears to be a URL (e.g., Supabase URL). Misconfigured env.");
      console.log(`🔧 Config summary: clientId=${clientId?.slice(0,4)}..., secretLen=${clientSecret?.length ?? 0}, redirectUri=${redirectUri}`);
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          error: "Server configuration error",
          details: "FITBIT_CLIENT_SECRET appears to be a URL. Set it to your actual Fitbit Client Secret in Netlify environment variables.",
        }),
      };
    }

    console.log(`🔧 Config summary: clientId=${clientId?.slice(0,4)}..., secretLen=${clientSecret?.length ?? 0}, redirectUri=${redirectUri}`);

    // Diagnostics mode: return non-sensitive configuration summary when ?debug=1, true, or yes
    const DEBUG_VERSION = "fitbit-exchange:2025-10-14-02";
    const debugParam = (event.queryStringParameters?.debug || "").toLowerCase();
    const isDebug = ["1", "true", "yes"].includes(debugParam);
    
    // Check Supabase environment variables presence (without exposing values)
    const hasSupabaseUrl = !!process.env.SUPABASE_URL;
    const hasSupabaseServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log("🪵 Debug params:", { 
      queryStringParams: event.queryStringParameters, 
      isDebug, 
      hasSupabaseUrl, 
      hasSupabaseServiceKey 
    });
    
    if (isDebug) {
      const secretLooksLikeUrl =
        looksLikeUrl(clientSecret) || (clientSecret && clientSecret.includes("supabase.co")) || false;
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          debug: true,
          version: DEBUG_VERSION,
          method: event.httpMethod,
          clientIdPrefix: clientId?.slice(0, 4),
          secretLength: clientSecret?.length ?? 0,
          secretLooksLikeUrl,
          redirectUri,
          hasSupabaseUrl,
          hasSupabaseServiceKey,
        }),
      };
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || "{}");
    const { code, code_verifier } = body;

    if (!code) {
      console.error("❌ Missing authorization code");
      return { 
        statusCode: 400, 
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing authorization code" }) 
      };
    }

    console.log("🔄 Starting Fitbit token exchange...");

    // Create Basic Auth header
    const authHeader = "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    // Prepare URL-encoded body
    const tokenRequestBody = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
    });

    // Add code_verifier if provided (PKCE flow)
    if (code_verifier) {
      tokenRequestBody.append("code_verifier", code_verifier);
      console.log("🔐 Using PKCE flow with code_verifier");
    }

    const tokenRequestBodyString = tokenRequestBody.toString();

    console.log("🔑 Exchanging code with Fitbit API...");

    // Exchange code with Fitbit
    const fitbitResponse = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenRequestBodyString,
    });

    const tokenData: FitbitTokenResponse = await fitbitResponse.json();

    // Log the full Fitbit response
    console.log("📦 Full Fitbit API Response:", JSON.stringify(tokenData, null, 2));

    if (!fitbitResponse.ok) {
      console.error("❌ Fitbit token exchange failed:", tokenData);
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Fitbit token exchange failed", details: tokenData }),
      };
    }

    console.log("✅ Token data received from Fitbit");

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase environment variables");
      return {
        statusCode: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Database configuration error" }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("💾 Saving tokens to Supabase...");

    // Store tokens in the activity JSONB column
    const { error } = await supabase.from("fitbit_auto_data").insert([
      {
        user_id: null,
        fetched_at: new Date().toISOString(),
        activity: {
          fitbit_user_id: tokenData.user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_in: tokenData.expires_in,
          scope: tokenData.scope,
          token_type: tokenData.token_type,
        },
      },
    ]);

    if (error) {
      console.error("❌ Supabase insert failed:", error);
      throw error;
    }

    console.log("✅ Tokens saved to Supabase fitbit_auto_data table");

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ 
        message: "Fitbit tokens saved successfully",
        data: {
          user_id: tokenData.user_id,
          access_token: tokenData.access_token
        }
      }),
    };
  } catch (err) {
    console.error("❌ Token exchange error:", err);
    return { 
      statusCode: 500, 
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Internal server error", details: err.message }) 
    };
  }
};
