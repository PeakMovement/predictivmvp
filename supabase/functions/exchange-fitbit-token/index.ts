import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try reading the code from JSON or query params
    let code = null;
    try {
      const body = await req.json();
      code = body.code;
    } catch {
      const url = new URL(req.url);
      code = url.searchParams.get("code");
    }

    if (!code) {
      return new Response(JSON.stringify({ error: "Authorization code missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    const redirectUri = Deno.env.get("FITBIT_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("❌ Missing Fitbit credentials in environment variables");
      return new Response(JSON.stringify({ error: "Server misconfiguration: missing Fitbit credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

    // Exchange the code for tokens via Fitbit API
    const tokenResponse = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    });

    const tokenData = await tokenResponse.json().catch(() => null);

    if (!tokenResponse.ok || !tokenData) {
      console.error("⚠️ Fitbit token exchange failed:", tokenData);
      return new Response(JSON.stringify({ error: "Failed to exchange authorization code", details: tokenData }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ Success: return tokens
    return new Response(
      JSON.stringify({
        success: true,
        message: "Fitbit token exchange successful",
        data: {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          user_id: tokenData.user_id,
          expires_in: tokenData.expires_in,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("💥 Unexpected server error:", error);
    return new Response(JSON.stringify({ error: "Unexpected server error", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
