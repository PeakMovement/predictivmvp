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
    const { code, code_verifier, user_id } = await req.json();

    if (!code || !code_verifier || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters: code, code_verifier, or user_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      console.error("Fitbit OAuth credentials not configured");
      return new Response(
        JSON.stringify({ error: "Fitbit OAuth not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const creds = btoa(`${clientId}:${clientSecret}`);

    console.log(`[fitbit-callback] Exchanging code for tokens for user: ${user_id}`);

    const tokenResp = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        redirect_uri: "https://predictiv.netlify.app/fitbit/callback",
        code,
        code_verifier,
      }),
    });

    if (!tokenResp.ok) {
      const errorText = await tokenResp.text();
      console.error("[fitbit-callback] Token exchange failed:", errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to exchange authorization code",
          details: errorText
        }),
        {
          status: tokenResp.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const data = await tokenResp.json();

    console.log(`[fitbit-callback] Token exchange successful for user: ${user_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await supabase
      .from("fitbit_tokens")
      .upsert({
        user_id,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type || "Bearer",
        expires_in: data.expires_in,
        scope: data.scope,
        fitbit_user_id: data.user_id,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) {
      console.error("[fitbit-callback] Database error:", upsertError);
      return new Response(
        JSON.stringify({
          error: "Failed to store tokens",
          details: upsertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    console.log(`[fitbit-callback] Tokens stored successfully for user: ${user_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Fitbit connected successfully",
        user_id,
        expires_in: data.expires_in
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("[fitbit-callback] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
