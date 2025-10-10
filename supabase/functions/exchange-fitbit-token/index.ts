import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    // ✅ Get code from URL query (not JSON)
    const url = new URL(req.url);
    const code = url.searchParams.get("code");

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    const redirectUri = "https://predictiv.netlify.app/auth/fitbit";

    if (!clientId || !clientSecret) {
      console.error("Missing Fitbit credentials");
      return new Response(JSON.stringify({ success: false, error: "Missing Fitbit credentials" }), {
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

    const text = await tokenResponse.text();
    let tokenData = {};
    try {
      tokenData = JSON.parse(text);
    } catch {
      console.error("Fitbit returned non-JSON:", text);
    }

    return new Response(
      JSON.stringify({
        success: tokenResponse.ok,
        message: tokenResponse.ok ? "Fitbit connection successful" : "Fitbit connection failed",
        data: tokenData,
      }),
      {
        status: tokenResponse.ok ? 200 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Fitbit exchange error:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
