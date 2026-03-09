/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // SECURITY: Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[oura-auth] [ERROR] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authentication", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[oura-auth] [ERROR] Supabase credentials not available");
      throw new Error("Supabase credentials not available in Edge Runtime environment");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate the JWT and extract user_id from the authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[oura-auth] [ERROR] Invalid authentication token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token", success: false }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Use authenticated user.id instead of request body
    const user_id = user.id;

    const { code } = await req.json();

    if (!code) {
      console.error("[oura-auth] [ERROR] Missing code in request");
      return new Response(
        JSON.stringify({ error: "Missing authorization code", success: false }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }


    // Get Oura credentials from environment
    const ouraClientId = Deno.env.get("OURA_CLIENT_ID");
    const ouraClientSecret = Deno.env.get("OURA_CLIENT_SECRET");

    if (!ouraClientId || !ouraClientSecret) {
      const missingCreds = [];
      if (!ouraClientId) missingCreds.push("OURA_CLIENT_ID");
      if (!ouraClientSecret) missingCreds.push("OURA_CLIENT_SECRET");

      console.error(`[oura-auth] [ERROR] Missing credentials: ${missingCreds.join(", ")}`);
      throw new Error(`Oura credentials not configured. Missing: ${missingCreds.join(", ")}`);
    }


    // Exchange authorization code for tokens
    const redirectUri = Deno.env.get("OURA_REDIRECT_URI");
    
    if (!redirectUri) {
      console.error("[oura-auth] [ERROR] OURA_REDIRECT_URI is not configured");
      throw new Error("Oura redirect URI not configured. Please set OURA_REDIRECT_URI in Edge Function secrets.");
    }
    
    const tokenRequestBody = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: ouraClientId,
      client_secret: ouraClientSecret,
    };

      grant_type: tokenRequestBody.grant_type,
      redirect_uri: tokenRequestBody.redirect_uri,
      client_id: `${ouraClientId.substring(0, 8)}...`,
      code_length: code.length
    });

    const tokenResponse = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(tokenRequestBody),
    });


    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[oura-auth] [ERROR] Oura API error response:", {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: tokenData
      });

      let errorMessage = `Oura API error (${tokenResponse.status})`;

      if (tokenData.error === "invalid_grant") {
        errorMessage = "Authorization code expired or invalid. Please try connecting again.";
      } else if (tokenData.error === "invalid_client") {
        errorMessage = "Invalid Oura API credentials. Please verify OURA_CLIENT_ID and OURA_CLIENT_SECRET.";
      } else if (tokenData.error === "redirect_uri_mismatch") {
        errorMessage = `Redirect URI mismatch. Expected: ${redirectUri}. Check Oura Developer Portal settings.`;
      } else if (tokenData.error_description) {
        errorMessage = tokenData.error_description;
      }

      throw new Error(errorMessage);
    }


    // Calculate expiration timestamp as ISO string (timestamptz format)
    const expiresAtTimestamp = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();


    // Verify we have all required token data
    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error(`Incomplete token data from Oura: missing ${!tokenData.access_token ? 'access_token' : 'refresh_token'}`);
    }

    // NOTE: token_type is returned by Oura (typically "Bearer") but is intentionally NOT stored.
    // The oura_tokens view schema does not include a token_type column.
    // This is acceptable because:
    // 1. Oura API always uses Bearer token authentication
    // 2. The token_type is implicit and doesn't need to be persisted
    // 3. Adding it would require a schema migration with no functional benefit
    if (tokenData.token_type) {
    }

    // Upsert tokens to database with proper scope
    const { data: upsertData, error } = await supabase
      .from("oura_tokens")
      .upsert({
        user_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAtTimestamp,
        scope: tokenData.scope || "email personal daily heartrate workout tag session spo2",
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      console.error("[oura-auth] [ERROR] Database error:", error.message);
      throw new Error(`Failed to save tokens: ${error.message}`);
    }


    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("[oura-auth] [ERROR] Unhandled exception:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error", success: false }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
