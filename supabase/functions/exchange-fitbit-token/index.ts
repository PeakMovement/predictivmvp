import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Safely get authorization code from either JSON body or query params
    let code = null;
    try {
      const bodyText = await req.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        code = body.code;
      }
    } catch {
      const url = new URL(req.url);
      code = url.searchParams.get("code");
    }

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Authorization code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    const redirectUri = "https://predictiv.netlify.app/auth/fitbit";

    if (!clientId || !clientSecret) {
      console.error("Missing Fitbit credentials");
      return new Response(JSON.stringify({ success: false, error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

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

    const tokenText = await tokenResponse.text();
    let tokenData = null;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error("Failed to parse Fitbit token response:", tokenText);
    }

    if (!tokenResponse.ok || !tokenData) {
      console.error("Fitbit token exchange failed:", tokenText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to exchange authorization code", details: tokenText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { access_token, refresh_token, user_id } = tokenData;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Fitbit token exchange successful",
        data: { access_token, refresh_token, user_id },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in exchange-fitbit-token function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
