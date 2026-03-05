import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error);
      throw new Error(`OAuth error: ${error}`);
    }

    if (!code || !state) {
      throw new Error("Missing code or state parameter");
    }

    const userId = state;

    const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
    const googleRedirectUri = Deno.env.get("GOOGLE_REDIRECT_URI") || `${supabaseUrl.replace('.supabase.co', '')}/google-calendar-callback`;

    if (!googleClientId || !googleClientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    const expiresAt = new Date(Date.now() + expires_in * 1000);

    const { error: upsertError } = await supabase
      .from("google_calendar_tokens")
      .upsert({
        user_id: userId,
        access_token,
        refresh_token,
        expires_at: expiresAt.toISOString(),
        scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (upsertError) {
      console.error("Database error:", upsertError);
      throw new Error("Failed to save tokens");
    }

    console.log("Successfully saved Google Calendar tokens for user:", userId);

    const { error: syncLogError } = await supabase
      .from("google_calendar_sync_logs")
      .insert({
        user_id: userId,
        sync_type: "initial",
        status: "success",
        events_synced: 0,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });

    if (syncLogError) {
      console.error("Failed to create sync log:", syncLogError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Google Calendar connected successfully",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
