import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Get code, optional PKCE code_verifier, and optional user_id from request body
    const { code, code_verifier, user_id } = await req.json();

    if (!code) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("FITBIT_CLIENT_ID");
    const clientSecret = Deno.env.get("FITBIT_CLIENT_SECRET");
    // Support both legacy and PKCE redirect URIs
    const redirectUri = code_verifier 
      ? "https://predictiv.netlify.app/fitbit/callback"
      : "https://predictiv.netlify.app/auth/fitbit";

    if (!clientId || !clientSecret) {
      console.error("Missing Fitbit credentials");
      return new Response(JSON.stringify({ success: false, error: "Missing Fitbit credentials" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const credentials = btoa(`${clientId}:${clientSecret}`);

    // Build token request body - include code_verifier if using PKCE
    const tokenParams: Record<string, string> = {
      client_id: clientId,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    };

    // Add code_verifier for PKCE flow (if provided)
    if (code_verifier) {
      tokenParams.code_verifier = code_verifier;
    }

    const tokenResponse = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(tokenParams),
    });

    const text = await tokenResponse.text();
    let tokenData = {};
    try {
      tokenData = JSON.parse(text);
    } catch {
      console.error("Fitbit returned non-JSON:", text);
    }

    // If Fitbit exchange failed, return error with details
    if (!tokenResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Fitbit connection failed",
          data: tokenData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Persist tokens to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase service credentials');
      return new Response(JSON.stringify({ success: false, error: 'Missing Supabase credentials' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const td: any = tokenData;
    const systemUserId = typeof user_id === 'string' ? user_id : null;

    if (!systemUserId) {
      console.error('❌ No user_id provided for token storage');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'user_id is required for token exchange',
          fitbit_user_id: td.user_id 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store in fitbit_tokens table
    const { error: insertError } = await supabase.from('fitbit_tokens').upsert({
      user_id: systemUserId,
      access_token: td.access_token,
      refresh_token: td.refresh_token,
      expires_in: td.expires_in,
      fitbit_user_id: td.user_id,
      scope: td.scope,
      token_type: td.token_type,
      refreshed_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('❌ Error storing tokens:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to store tokens', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Tokens stored successfully for user:', systemUserId);

    // Update users table
    const { error: updateError } = await supabase
      .from('users')
      .upsert({
        id: systemUserId,
        fitbit_user_id: td.user_id,
        fitbit_connected: true,
      });

    return new Response(
      JSON.stringify({ success: true, message: 'Fitbit connection successful', data: td }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
