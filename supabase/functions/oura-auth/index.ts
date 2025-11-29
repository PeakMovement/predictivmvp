import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

    const { code, user_id } = await req.json();

    if (!code || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing code or user_id" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`[oura-auth] Exchanging code for user: ${user_id}`);
    console.log(`[oura-auth] Code length: ${code.length}`);

    // Get Oura credentials from environment
    const ouraClientId = Deno.env.get("OURA_CLIENT_ID");
    const ouraClientSecret = Deno.env.get("OURA_CLIENT_SECRET");

    if (!ouraClientId || !ouraClientSecret) {
      const missingCreds = [];
      if (!ouraClientId) missingCreds.push("OURA_CLIENT_ID");
      if (!ouraClientSecret) missingCreds.push("OURA_CLIENT_SECRET");

      console.error(`[oura-auth] Missing credentials: ${missingCreds.join(", ")}`);
      throw new Error(`Oura credentials not configured. Missing: ${missingCreds.join(", ")}`);
    }

    console.log(`[oura-auth] Using Client ID: ${ouraClientId.substring(0, 8)}...`);

    // Exchange authorization code for tokens
    const redirectUri = "https://predictiv.netlify.app/oauth/callback/oura";
    const tokenRequestBody = {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: ouraClientId,
      client_secret: ouraClientSecret,
    };

    console.log(`[oura-auth] Token exchange request:`, {
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

    console.log(`[oura-auth] Token response status: ${tokenResponse.status}`);

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[oura-auth] Oura API error response:", {
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

    console.log("[oura-auth] Successfully received tokens from Oura");

    // Get Supabase credentials - automatically provided by Edge Runtime
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not available in Edge Runtime environment");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate expiration timestamp as ISO string (timestamptz format)
    const expiresAtTimestamp = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    console.log("[oura-auth] Saving tokens to database...");

    // Verify we have all required token data
    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error(`Incomplete token data from Oura: missing ${!tokenData.access_token ? 'access_token' : 'refresh_token'}`);
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
      console.error("[oura-auth] Database error:", error);
      throw new Error(`Failed to save tokens: ${error.message}`);
    }

    console.log("[oura-auth] Successfully saved tokens to database");

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("[oura-auth] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});