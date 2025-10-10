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
    // ✅ Pull code safely from query params ONLY (Fitbit never sends a body)
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Authorization code missing in redirect." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    const redirectUri = "https://predictiv.netlify.app/auth/fitbit";

    if (!clientId || !clientSecret) {
      console.error("Missing Fitbit credentials");
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error (missing credentials)" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

    // ✅ Proper Fitbit token exchange request
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

    const text = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(text);
    } catch {
      console.error("Fitbit returned non-JSON:", text);
      return new Response(JSON.stringify({ success: false, error: "Fitbit returned invalid JSON", details: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!tokenResponse.ok) {
      console.error("Fitbit token exchange failed:", tokenData);
      return new Response(
        JSON.stringify({ success: false, error: "Fitbit token exchange failed", details: tokenData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { access_token, refresh_token, user_id } = tokenData;
    return new Response(
      JSON.stringify({
        success: true,
        message: "Fitbit connection successful",
        data: { access_token, refresh_token, user_id },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Exchange-Fitbit error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message || "Unexpected server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
