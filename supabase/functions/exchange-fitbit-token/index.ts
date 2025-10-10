import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ✅ Safely extract authorization code (Fitbit only sends in query)
    let code: string | null = null;
    try {
      const url = new URL(req.url);
      code = url.searchParams.get("code");
    } catch {
      console.warn("Could not parse URL for code");
    }

    // ✅ Try to extract from body if present (for testing)
    if (!code) {
      try {
        const text = await req.text();
        if (text) {
          const body = JSON.parse(text);
          code = body.code || null;
        }
      } catch {
        console.warn("No valid JSON body found");
      }
    }

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Authorization code is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ Load credentials from environment
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

    // ✅ Exchange code for token
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
      console.error("Fitbit returned invalid JSON:", tokenText);
    }

    if (!tokenResponse.ok || !tokenData) {
      console.error("Fitbit token exchange failed:", tokenText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to exchange authorization code",
          details: tokenText,
        }),
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
    console.error("Error in exchange-fitbit-token:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unexpected server error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
