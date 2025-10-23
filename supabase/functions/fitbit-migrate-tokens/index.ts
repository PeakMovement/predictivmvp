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
    const { user_id } = await req.json();
    
    // Validate user_id
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "Missing user_id in request body" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(user_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid user_id format (must be UUID)" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`🔄 Starting token migration for user: ${user_id}`);

    // Look for old tokens in activity blobs
    const { data: oldData, error: fetchError } = await supabase
      .from("fitbit_auto_data")
      .select("activity, fetched_at")
      .eq("user_id", user_id)
      .not("activity->tokens", "is", null)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error("Error fetching old tokens:", fetchError);
      return new Response(
        JSON.stringify({ error: `Database error: ${fetchError.message}` }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // No old tokens found
    if (!oldData || !oldData.activity?.tokens) {
      console.log(`ℹ️  No old tokens found for user: ${user_id}`);
      return new Response(
        JSON.stringify({ 
          migrated: false, 
          reason: "No old tokens found in fitbit_auto_data.activity.tokens" 
        }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = oldData.activity.tokens;
    console.log(`✅ Found old tokens for user: ${user_id}`);

    // Calculate expires_in (expecting integer seconds)
    let expiresIn = 28800; // Default 8 hours
    if (tokens.expires_at) {
      // If expires_at is provided, calculate remaining seconds
      const expiresAtTime = new Date(tokens.expires_at).getTime();
      const nowTime = Date.now();
      const remainingSeconds = Math.floor((expiresAtTime - nowTime) / 1000);
      expiresIn = remainingSeconds > 0 ? remainingSeconds : 28800;
    } else if (tokens.expires_in) {
      expiresIn = tokens.expires_in;
    }

    // Upsert tokens into fitbit_tokens table
    const { error: upsertError } = await supabase
      .from("fitbit_tokens")
      .upsert(
        {
          user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: expiresIn,
          token_type: tokens.token_type || 'Bearer',
          scope: tokens.scope || 'activity heartrate location nutrition profile settings sleep social weight',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      console.error("Error upserting tokens:", upsertError);
      return new Response(
        JSON.stringify({ error: `Failed to migrate tokens: ${upsertError.message}` }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Tokens migrated to fitbit_tokens table for user: ${user_id}`);

    // Strip tokens from all fitbit_auto_data records for this user
    const { error: stripError } = await supabase.rpc("strip_tokens_from_activity", { u_id: user_id });

    if (stripError) {
      console.error("Error stripping tokens from activity:", stripError);
      // Don't fail the migration, tokens were already saved
      console.warn(`⚠️  Tokens migrated but cleanup failed: ${stripError.message}`);
    } else {
      console.log(`✅ Stripped tokens from fitbit_auto_data for user: ${user_id}`);
    }

    return new Response(
      JSON.stringify({ 
        migrated: true,
        tokens_moved: true,
        activity_cleaned: !stripError,
        message: "Token migration completed successfully"
      }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error("Migration error:", err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
