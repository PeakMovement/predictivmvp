import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Generate a cryptographically random code_verifier for PKCE (43-128 chars).
 * Characters: A-Z, a-z, 0-9, -, ., _, ~
 */
function generateCodeVerifier(length = 64): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map((v) => chars[v % chars.length])
    .join("");
}

/**
 * Derive the code_challenge from a code_verifier using S256.
 * code_challenge = base64url( sha256( code_verifier ) )
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  // Base64url encode (no padding)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Generate a random state parameter for CSRF protection.
 */
function generateState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // ── 1. Authenticate the user ──────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[garmin-auth-initiate] [ERROR] Missing or malformed Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized — missing authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[garmin-auth-initiate] [ERROR] Supabase credentials not available");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);

    if (claimsError || !claimsData?.user) {
      console.error("[garmin-auth-initiate] [ERROR] Invalid authentication token:", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized — invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userId = claimsData.user.id;
    console.log(`[garmin-auth-initiate] Authenticated user: ${userId}`);

    // ── 2. Read Garmin credentials from env ───────────────────────────
    const clientId = Deno.env.get("GARMIN_CONSUMER_KEY");
    const redirectUri = Deno.env.get("GARMIN_REDIRECT_URI");

    if (!clientId) {
      console.error("[garmin-auth-initiate] [ERROR] GARMIN_CONSUMER_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Garmin OAuth not configured. Missing GARMIN_CONSUMER_KEY." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!redirectUri) {
      console.error("[garmin-auth-initiate] [ERROR] GARMIN_REDIRECT_URI is not configured");
      return new Response(
        JSON.stringify({ error: "Garmin OAuth not configured. Missing GARMIN_REDIRECT_URI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3. Generate PKCE parameters ──────────────────────────────────
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    console.log(`[garmin-auth-initiate] Generated PKCE challenge for user: ${userId}`);

    // ── 4. Persist code_verifier + state server-side ─────────────────
    //    Clean up any stale rows for this user first
    await supabase
      .from("garmin_oauth_state")
      .delete()
      .eq("user_id", userId);

    const { error: insertError } = await supabase
      .from("garmin_oauth_state")
      .insert({
        user_id: userId,
        state,
        code_verifier: codeVerifier,
        // expires_at defaults to now() + 10 min via table default
      });

    if (insertError) {
      console.error("[garmin-auth-initiate] [ERROR] Failed to store PKCE state:", insertError.message);
      return new Response(
        JSON.stringify({ error: "Failed to prepare OAuth session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 5. Build Garmin authorization URL ────────────────────────────
    const authUrl =
      `https://connect.garmin.com/oauth2Confirm?` +
      `response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code_challenge=${encodeURIComponent(codeChallenge)}` +
      `&code_challenge_method=S256` +
      `&state=${encodeURIComponent(state)}`;

    console.log(`[garmin-auth-initiate] [SUCCESS] Authorization URL generated for user: ${userId}`);

    return new Response(
      JSON.stringify({
        auth_url: authUrl,
        message: "Garmin authorization URL generated successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[garmin-auth-initiate] [ERROR] Unexpected:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
