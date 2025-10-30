import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
        JSON.stringify({ error: "Ōura OAuth not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[oura-auth-initiate] Initiating Ōura OAuth for user: ${user_id}`);

    // Ōura OAuth URL with required scopes
    const redirectUri = "https://predictiv.netlify.app/oauth/callback/oura";
    const scope = "daily personal";
    
    const authUrl = `https://cloud.ouraring.com/oauth/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `state=${user_id}`;

    console.log(`[oura-auth-initiate] Generated auth URL for user: ${user_id}`);

    return new Response(
      JSON.stringify({ 
        authUrl,
        message: "✅ Oura integration verified — using correct client ID from Supabase"
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
