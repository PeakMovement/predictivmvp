/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response(
        JSON.stringify({ error: "Missing code or state parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = state;

    const polarClientId = Deno.env.get("POLAR_CLIENT_ID");
    const polarClientSecret = Deno.env.get("POLAR_CLIENT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!polarClientId || !polarClientSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error("Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "server_config_missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const credentials = btoa(`${polarClientId}:${polarClientSecret}`);
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
    });

    const tokenResponse = await fetch("https://polarremote.com/v2/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", tokenResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "invalid_code" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const polarUserId = tokenData.x_user_id;
    const scope = tokenData.scope || "accesslink.read_all";

    if (!accessToken || !polarUserId) {
      console.error("Missing access_token or x_user_id in token response");
      return new Response(
        JSON.stringify({ error: "Invalid token response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const registerResponse = await fetch("https://www.polaraccesslink.com/v3/users", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "member-id": userId }),
    });

    if (registerResponse.status === 403) {
      return new Response(
        JSON.stringify({ error: "consent_required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!registerResponse.ok && registerResponse.status !== 409) {
      const errorText = await registerResponse.text();
      console.error("User registration failed:", registerResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "User registration failed" }),
        {
          status: registerResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await supabase
      .from("polar_tokens")
      .upsert({
        user_id: userId,
        polar_user_id: polarUserId,
        access_token: accessToken,
        member_id: userId,
        scope: scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Error upserting polar_tokens:", upsertError);
      return new Response(
        JSON.stringify({ error: "Database error", details: upsertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: logError } = await supabase
      .from("polar_logs")
      .insert({
        user_id: userId,
        event_type: "auth_success",
        status: "success",
        details: {
          polar_user_id: polarUserId,
          scope: scope,
        },
      });

    if (logError) {
      console.warn("Failed to log auth success:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, connected: true }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in polar-auth-callback:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});