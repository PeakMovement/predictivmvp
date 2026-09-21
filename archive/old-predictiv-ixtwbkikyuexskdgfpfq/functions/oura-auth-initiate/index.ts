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
    // SECURITY: Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[oura-auth-initiate] [ERROR] Missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[oura-auth-initiate] [ERROR] Supabase credentials not available");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: Validate the JWT and extract user_id from the authenticated user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[oura-auth-initiate] [ERROR] Invalid authentication token:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized - invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY: Use authenticated user.id instead of request body
    const user_id = user.id;

    const clientId = Deno.env.get("OURA_CLIENT_ID");

    if (!clientId) {
      console.error("[oura-auth-initiate] [ERROR] OURA_CLIENT_ID is not configured");
      return new Response(
        JSON.stringify({ error: "Ōura OAuth not configured. Please set OURA_CLIENT_ID in Edge Function secrets." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }


    // Ōura OAuth URL with comprehensive scopes for full data access
    // Valid scopes per official docs: email, personal, daily, heartrate, workout, tag, session, spo2
    const redirectUri = Deno.env.get("OURA_REDIRECT_URI");
    
    if (!redirectUri) {
      console.error("[oura-auth-initiate] [ERROR] OURA_REDIRECT_URI is not configured");
      return new Response(
        JSON.stringify({ error: "Ōura OAuth not configured. Please set OURA_REDIRECT_URI in Edge Function secrets." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const scope = "email personal daily heartrate workout tag session spo2";
    
    // SECURITY: Use authenticated user_id in state parameter
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${user_id}`;


    return new Response(
      JSON.stringify({ 
        auth_url: authUrl,
        message: "Oura authorization URL generated successfully"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("[oura-auth-initiate] [ERROR]:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
