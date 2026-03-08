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
const FRONTEND_URL =
  Deno.env.get("FRONTEND_URL") || "https://predictiv.netlify.app";

// ── PKCE helpers ─────────────────────────────────────────────────────

function generateCodeVerifier(length = 64): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map((v) => chars[v % chars.length])
    .join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Main handler ─────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const userId = url.searchParams.get("userId");

    // ── Initialize Supabase (needed for both modes) ───────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[garmin-auth] [ERROR] Supabase credentials not available");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=server_config` },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ════════════════════════════════════════════════════════════════════
    // MODE A: INITIATION — called directly by the Reconnect button with
    //         ?userId=<uid>. Generate PKCE, store state, redirect to Garmin.
    // ════════════════════════════════════════════════════════════════════
    if (userId && !code && !state && !error) {
      console.log(`[garmin-auth] [INITIATE] Starting OAuth for user: ${userId}`);

      // Basic userId validation
      if (userId.length > 128 || !/^[a-f0-9-]+$/.test(userId)) {
        console.error("[garmin-auth] [INITIATE] Invalid userId format");
        return new Response(null, {
          status: 302,
          headers: { Location: `${FRONTEND_URL}/settings?garmin_error=invalid_user` },
        });
      }

      const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
      const redirectUri = Deno.env.get("GARMIN_REDIRECT_URI");

      if (!clientId || !redirectUri) {
        console.error("[garmin-auth] [INITIATE] Missing Garmin credentials");
        return new Response(null, {
          status: 302,
          headers: { Location: `${FRONTEND_URL}/settings?garmin_error=server_config` },
        });
      }

      // Generate PKCE + CSRF state
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const oauthState = generateState();

      // Clean up any stale rows for this user, then store new state
      await supabase.from("garmin_oauth_state").delete().eq("user_id", userId);

      const { error: insertError } = await supabase
        .from("garmin_oauth_state")
        .insert({
          user_id: userId,
          state: oauthState,
          code_verifier: codeVerifier,
          // expires_at defaults to now() + 10 min via table default
        });

      if (insertError) {
        console.error("[garmin-auth] [INITIATE] Failed to store PKCE state:", insertError.message);
        return new Response(null, {
          status: 302,
          headers: { Location: `${FRONTEND_URL}/settings?garmin_error=session_error` },
        });
      }

      const authUrl =
        `https://connect.garmin.com/oauth2Confirm?` +
        `response_type=code` +
        `&client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&code_challenge=${encodeURIComponent(codeChallenge)}` +
        `&code_challenge_method=S256` +
        `&state=${encodeURIComponent(oauthState)}`;

      console.log(`[garmin-auth] [INITIATE] Redirecting user ${userId} to Garmin OAuth`);
      console.log(`[garmin-auth] [INITIATE] redirect_uri: ${redirectUri}`);

      return new Response(null, {
        status: 302,
        headers: { Location: authUrl },
      });
    }

    // ════════════════════════════════════════════════════════════════════
    // MODE B: CALLBACK — Garmin redirects here with ?code=&state= after
    //         the user authorises. Exchange code for tokens.
    // ════════════════════════════════════════════════════════════════════

    // Handle user denial / Garmin error
    if (error) {
      console.error(`[garmin-auth] [CALLBACK] Garmin returned error: ${error}`);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${FRONTEND_URL}/settings?garmin_error=${encodeURIComponent(error)}`,
        },
      });
    }

    if (!code || !state) {
      console.error("[garmin-auth] [CALLBACK] Missing code or state; also missing userId — no valid mode");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=missing_params` },
      });
    }

    // Input validation
    if (code.length > 512 || state.length > 128) {
      console.error("[garmin-auth] [CALLBACK] Code or state exceeds max length");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=invalid_params` },
      });
    }

    console.log(`[garmin-auth] [CALLBACK] Received callback with state: ${state.substring(0, 8)}...`);

    // ── Validate state & retrieve PKCE code_verifier ──────────────────
    const { data: oauthStateRow, error: stateError } = await supabase
      .from("garmin_oauth_state")
      .select("*")
      .eq("state", state)
      .maybeSingle();

    if (stateError || !oauthStateRow) {
      console.error("[garmin-auth] [CALLBACK] Invalid or expired state:", stateError?.message);
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=invalid_state` },
      });
    }

    if (new Date(oauthStateRow.expires_at) < new Date()) {
      console.error("[garmin-auth] [CALLBACK] OAuth state expired");
      await supabase.from("garmin_oauth_state").delete().eq("id", oauthStateRow.id);
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=state_expired` },
      });
    }

    const callbackUserId = oauthStateRow.user_id;
    const codeVerifier = oauthStateRow.code_verifier;

    console.log(`[garmin-auth] [CALLBACK] State validated for user: ${callbackUserId}`);

    // Delete used state immediately (one-time use)
    await supabase.from("garmin_oauth_state").delete().eq("id", oauthStateRow.id);

    // ── Read Garmin credentials ───────────────────────────────────────
    const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
    const clientSecret = Deno.env.get("GARMIN_CONSUMER_SECRET");
    const redirectUri = Deno.env.get("GARMIN_REDIRECT_URI");

    if (!clientId || !clientSecret || !redirectUri) {
      console.error("[garmin-auth] [CALLBACK] Missing Garmin credentials");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=server_config` },
      });
    }

    // ── Exchange authorization code for tokens ────────────────────────
    console.log("[garmin-auth] [CALLBACK] Exchanging authorization code for tokens...");

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

    console.log(`[garmin-auth] [CALLBACK] Token response status: ${tokenResponse.status}`);

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("[garmin-auth] [CALLBACK] Token exchange failed:", {
        status: tokenResponse.status,
        error: tokenData.error,
        description: tokenData.error_description,
      });

      let errorKey = "token_exchange_failed";
      if (tokenData.error === "invalid_grant") errorKey = "code_expired";
      else if (tokenData.error === "invalid_client") errorKey = "invalid_credentials";

      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=${errorKey}` },
      });
    }

    if (!tokenData.access_token) {
      console.error("[garmin-auth] [CALLBACK] No access_token in response");
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=no_token` },
      });
    }

    console.log("[garmin-auth] [CALLBACK] Token exchange successful");

    // ── Calculate expiry ──────────────────────────────────────────────
    const expiresInSeconds = tokenData.expires_in || 86400;
    const expiresAt = new Date(
      Date.now() + (expiresInSeconds - 600) * 1000
    ).toISOString();

    // ── Store tokens in wearable_tokens ──────────────────────────────
    const { error: upsertError } = await supabase
      .from("wearable_tokens")
      .upsert(
        {
          user_id: callbackUserId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          expires_at: expiresAt,
          expires_in: expiresInSeconds,
          scope: "garmin",
          token_type: tokenData.token_type || "bearer",
          status: "active",
        },
        { onConflict: "user_id,scope" }
      );

    if (upsertError) {
      console.error("[garmin-auth] [CALLBACK] Failed to store tokens:", upsertError.message);
      return new Response(null, {
        status: 302,
        headers: { Location: `${FRONTEND_URL}/settings?garmin_error=db_error` },
      });
    }

    console.log(`[garmin-auth] [CALLBACK] [SUCCESS] Garmin tokens stored for user: ${callbackUserId}`);

    // ── Fetch and store Garmin's stable userId for webhook matching ───
    try {
      const garminUserRes = await fetch(
        "https://apis.garmin.com/wellness-api/rest/user/id",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
      );
      if (garminUserRes.ok) {
        const garminUserData = await garminUserRes.json();
        if (garminUserData.userId) {
          await supabase
            .from("wearable_tokens")
            .update({ provider_user_id: garminUserData.userId })
            .eq("user_id", callbackUserId)
            .eq("scope", "garmin");
          console.log(`[garmin-auth] Stored Garmin provider userId for user: ${callbackUserId}`);
        }
      } else {
        console.warn(`[garmin-auth] Could not fetch Garmin userId (${garminUserRes.status})`);
      }
    } catch (e) {
      console.warn("[garmin-auth] Garmin userId fetch failed (non-fatal):", e instanceof Error ? e.message : String(e));
    }

    // ── Clean up expired PKCE states ──────────────────────────────────
    await supabase
      .from("garmin_oauth_state")
      .delete()
      .lt("expires_at", new Date().toISOString());

    // ── Trigger initial Garmin data backfill (fire-and-forget) ────────
    try {
      fetch(`${supabaseUrl}/functions/v1/fetch-garmin-data`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_id: callbackUserId }),
      }).catch((e) => console.warn("[garmin-auth] Data backfill fetch failed:", e));
    } catch (e) {
      console.warn("[garmin-auth] Could not trigger data backfill:", e);
    }

    // ── Redirect back to Settings ─────────────────────────────────────
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}/settings?garmin_connected=true`,
      },
    });
  } catch (err) {
    console.error("[garmin-auth] [ERROR] Unexpected:", err instanceof Error ? err.message : String(err));
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${FRONTEND_URL}/settings?garmin_error=unexpected`,
      },
    });
  }
});
