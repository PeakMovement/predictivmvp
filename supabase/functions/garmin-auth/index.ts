import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Garmin OAuth 2.0 PKCE token endpoint
const GARMIN_TOKEN_URL =
  "https://diauth.garmin.com/di-oauth2-service/oauth/token";

// Frontend URL to redirect user after OAuth completes
const FRONTEND_URL = "https://id-preview--496b78dd-5429-4d22-8cdf-157ebd1425c9.lovable.app";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── 1. Parse callback parameters ──────────────────────────────────
    // Garmin redirects here as GET with ?code=...&state=...
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle user denial / Garmin error
    if (error) {
      console.error(`[garmin-auth] [ERROR] Garmin returned error: ${error}`);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}?garmin_error=${encodeURIComponent(error)}`,
        },
      });
    }

    if (!code || !state) {
      console.error("[garmin-auth] [ERROR] Missing code or state in callback");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}?garmin_error=missing_params`,
        },
      });
    }

    // Input validation
    if (code.length > 512 || state.length > 128) {
      console.error("[garmin-auth] [ERROR] Code or state exceeds max length");
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}?garmin_error=invalid_params`,
        },
      });
    }

    console.log(`[garmin-auth] Received callback with state: ${state.substring(0, 8)}...`);

    // ── 2. Initialize Supabase ────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[garmin-auth] [ERROR] Supabase credentials not available");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}?garmin_error=server_config` },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── 3. Validate state & retrieve PKCE code_verifier ───────────────
    const { data: oauthState, error: stateError } = await supabase
      .from("garmin_oauth_state")
      .select("*")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !oauthState) {
      console.error("[garmin-auth] [ERROR] Invalid or expired state:", stateError?.message);
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}?garmin_error=invalid_state` },
      });
    }

    // Check expiry
    if (new Date(oauthState.expires_at) < new Date()) {
      console.error("[garmin-auth] [ERROR] OAuth state expired");
      // Clean up expired state
      await supabase.from("garmin_oauth_state").delete().eq("id", oauthState.id);
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}?garmin_error=state_expired` },
      });
    }

    const userId = oauthState.user_id;
    const codeVerifier = oauthState.code_verifier;

    console.log(`[garmin-auth] State validated for user: ${userId}`);

    // Delete the used state immediately (one-time use)
    await supabase.from("garmin_oauth_state").delete().eq("id", oauthState.id);

    // ── 4. Read Garmin credentials ────────────────────────────────────
    const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
    const clientSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");
    const redirectUri = Deno.env.get("GARMIN_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[garmin-auth] [ERROR] Missing Garmin credentials");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}?garmin_error=server_config` },
      });
    }

    // ── 5. Exchange authorization code for tokens ─────────────────────
    console.log("[garmin-auth] Exchanging authorization code for tokens...");

    const tokenResponse = await fetch(GARMIN_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });

    console.log(`[garmin-auth] Token response status: ${tokenResponse.status}`);

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[garmin-auth] [ERROR] Token exchange failed:", {
        status: tokenResponse.status,
        error: tokenData.error,
        description: tokenData.error_description,
      });

      let errorKey = "token_exchange_failed";
      if (tokenData.error === "invalid_grant") errorKey = "code_expired";
      else if (tokenData.error === "invalid_client") errorKey = "invalid_credentials";

      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}?garmin_error=${errorKey}`,
        },
      });
    }

    if (!tokenData.access_token) {
      console.error("[garmin-auth] [ERROR] No access_token in response");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}?garmin_error=no_token` },
      });
    }

    console.log("[garmin-auth] Token exchange successful");

    // ── 6. Calculate expiry ──────────────────────────────────────────
    // Garmin tokens expire in ~86400s (24h). Subtract 600s buffer per Garmin recommendation.
    const expiresInSeconds = tokenData.expires_in || 86400;
    const expiresAt = new Date(
      Date.now() + (expiresInSeconds - 600) * 1000
    ).toISOString();

    // ── 7. Store tokens in wearable_tokens ────────────────────────────
    const { error: upsertError } = await supabase
      .from("wearable_tokens")
      .upsert(
        {
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          expires_at: expiresAt,
          expires_in: expiresInSeconds,
          scope: "garmin",
          token_type: tokenData.token_type || "bearer",
        },
        { onConflict: "user_id,scope" }
      );

    if (upsertError) {
      console.error("[garmin-auth] [ERROR] Failed to store tokens:", upsertError.message);
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}?garmin_error=db_error` },
      });
    }

    console.log(`[garmin-auth] [SUCCESS] Garmin tokens stored for user: ${userId}`);

    // ── 8. Clean up any remaining expired PKCE states ─────────────────
    await supabase
      .from("garmin_oauth_state")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // ── 9. Redirect user back to app ──────────────────────────────────
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}?garmin_connected=true`,
      },
    });
  } catch (err) {
    console.error("[garmin-auth] [ERROR] Unexpected:", err instanceof Error ? err.message : String(err));
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}?garmin_error=unexpected`,
      },
    });
  }
});
