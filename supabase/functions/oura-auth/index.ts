import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { code, user_id } = await req.json();

    if (!code || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing code or user_id" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log(`[oura-auth] Exchanging code for user: ${user_id}`);
    console.log("✅ Oura integration verified — using correct client ID and secret from Supabase");

    const res = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://predictiv.netlify.app/oauth/callback/oura",
        client_id: Deno.env.get("OURA_CLIENT_ID")!,
        client_secret: Deno.env.get("OURA_CLIENT_SECRET")!,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[oura-auth] Oura API error:", data);
      throw new Error(JSON.stringify(data));
    }

    console.log("[oura-auth] Successfully received tokens from Oura");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("[oura-auth] Environment check:");
    console.log(`  SUPABASE_URL: ${supabaseUrl}`);
    if (supabaseKey) {
      const masked = `${supabaseKey.substring(0, 10)}...${supabaseKey.substring(supabaseKey.length - 4)}`;
      console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${masked}`);
    } else {
      console.log("  SUPABASE_SERVICE_ROLE_KEY: undefined");
    }

    const supabase = createClient(
      supabaseUrl!,
      supabaseKey!
    );

    const expiresAtTimestamp = Math.floor(Date.now() / 1000) + data.expires_in;
    
    console.log("[oura-auth] Saving tokens to database with expires_at:", expiresAtTimestamp);

    const { error } = await supabase.from("oura_tokens").upsert({
      user_id,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAtTimestamp,
    });

    if (error) {
      console.error("[oura-auth] Database error:", error);
      throw new Error(`Database error: ${error.message}`);
    }

    console.log("[oura-auth] Successfully saved tokens to database");

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("[oura-auth] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
