import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // Get code and user_id from either URL params (GET) or JSON body (POST)
    let code: string | null = null;
    let user_id: string | null = null;

    if (req.method === 'GET') {
      // OAuth callback sends GET request with URL parameters
      code = url.searchParams.get('code');
      user_id = url.searchParams.get('state'); // Fitbit passes state parameter back
    } else if (req.method === 'POST') {
      // Also support POST with JSON body
      const body = await req.json().catch(() => ({}));
      code = body.code;
      user_id = body.user_id;
    }

    if (!code) {
      console.error('❌ Missing authorization code');
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user_id) {
      console.error('❌ Missing user_id');
      return new Response(
        JSON.stringify({ error: 'Missing user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 [exchange-fitbit-token] Starting token exchange for user: ${user_id}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Exchange authorization code for tokens
    console.log('🔑 [exchange-fitbit-token] Exchanging code for tokens...');
    const tokenRes = await fetch("https://api.fitbit.com/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${Deno.env.get("FITBIT_CLIENT_ID")!}:${Deno.env.get("FITBIT_CLIENT_SECRET")!}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: Deno.env.get("FITBIT_REDIRECT_URI")!,
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error("❌ [exchange-fitbit-token] Fitbit token exchange failed:", text);
      return new Response(
        JSON.stringify({ error: `Fitbit API error: ${tokenRes.status}`, details: text }),
        { status: tokenRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenData = await tokenRes.json();
    console.log(`✅ [exchange-fitbit-token] Tokens received, expires in ${tokenData.expires_in}s`);

    // Upsert into fitbit_tokens table (using expires_in, not expires_at)
    const { error: upsertError } = await supabase.from("fitbit_tokens").upsert(
      {
        user_id,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in, // Store as integer seconds
        fitbit_user_id: tokenData.user_id,
        scope: tokenData.scope,
        token_type: tokenData.token_type,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      console.error('❌ [exchange-fitbit-token] Database upsert failed:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save tokens', details: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💾 [exchange-fitbit-token] Tokens saved to fitbit_tokens table');

    // Mark user as connected in users table
    const { error: updateError } = await supabase
      .from("users")
      .upsert({
        id: user_id,
        fitbit_connected: true,
        fitbit_user_id: tokenData.user_id,
        connected_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (updateError) {
      console.warn('⚠️ [exchange-fitbit-token] Failed to update users table:', updateError.message);
      // Don't fail the request if this update fails
    } else {
      console.log('✅ [exchange-fitbit-token] User marked as connected');
    }

    console.log(`✅ [exchange-fitbit-token] Token exchange complete for user ${user_id}`);

    return new Response(
      JSON.stringify({ success: true, user_id, fitbit_user_id: tokenData.user_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("❌ [exchange-fitbit-token] Error:", err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
