import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { user_id } = await req.json();

    if (!user_id) {
      console.error("user_id is required");
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const clientId = Deno.env.get("OURA_CLIENT_ID");

    if (!clientId) {
      console.error("OURA_CLIENT_ID is not configured");
      return new Response(
        JSON.stringify({ error: "Ōura OAuth not configured. Please set OURA_CLIENT_ID in Edge Function secrets." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[oura-auth-initiate] Initiating Ōura OAuth for user: ${user_id}`);

    // Ōura OAuth URL with comprehensive scopes for full data access
    // Valid scopes per official docs: email, personal, daily, heartrate, workout, tag, session, spo2
    const redirectUri = Deno.env.get("OURA_REDIRECT_URI");
    
    if (!redirectUri) {
      console.error("OURA_REDIRECT_URI is not configured");
      return new Response(
        JSON.stringify({ error: "Ōura OAuth not configured. Please set OURA_REDIRECT_URI in Edge Function secrets." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    const scope = "email personal daily heartrate workout tag session spo2";
    
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${user_id}`;

    console.log(`[oura-auth-initiate] Generated auth URL for user: ${user_id}`);

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
    console.error("[oura-auth-initiate] Error:", error);
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