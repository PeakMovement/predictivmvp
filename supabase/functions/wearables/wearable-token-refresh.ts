// Unified token refresh for Fitbit, Ōura, and future wearable devices
// Handles OAuth token expiration and automatic refresh

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TokenRefreshRequest {
  user_id: string;
  provider: "fitbit" | "oura";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, provider } = await req.json() as TokenRefreshRequest;

    if (!user_id || !provider) {
      return new Response(
        JSON.stringify({ error: "user_id and provider are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[wearable-token-refresh] Refreshing ${provider} token for user: ${user_id}`);

    // Route to appropriate provider refresh logic
    switch (provider) {
      case "fitbit":
        // TODO: Implement Fitbit token refresh
        return new Response(
          JSON.stringify({
            success: false,
            message: "Fitbit token refresh not yet implemented",
            provider
          }),
          { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "oura":
        // TODO: Add Oura token refresh here later
        // Should fetch refresh token from oura_tokens and update
        return new Response(
          JSON.stringify({
            success: false,
            message: "Ōura token refresh pending implementation",
            provider
          }),
          { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      default:
        return new Response(
          JSON.stringify({ error: `Unsupported provider: ${provider}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[wearable-token-refresh] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
