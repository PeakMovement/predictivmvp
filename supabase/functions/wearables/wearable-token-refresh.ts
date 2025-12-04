// Unified token refresh for Fitbit, Ōura, and future wearable devices
// Routes to provider-specific implementations for token refresh

import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidOuraToken } from "../_shared/oura-token-refresh.ts";

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
      console.error("[wearable-token-refresh] [ERROR] Missing required parameters: user_id or provider");
      return new Response(
        JSON.stringify({ error: "user_id and provider are required", success: false }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[wearable-token-refresh] Refreshing ${provider} token for user: ${user_id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("[wearable-token-refresh] [ERROR] Supabase credentials not available");
      return new Response(
        JSON.stringify({ error: "Supabase credentials not available", success: false }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Route to appropriate provider refresh logic
    switch (provider) {
      case "fitbit":
        // TODO: Implement Fitbit token refresh using shared utility pattern
        console.log("[wearable-token-refresh] Fitbit token refresh not yet implemented");
        return new Response(
          JSON.stringify({
            success: false,
            message: "Fitbit token refresh not yet implemented",
            provider
          }),
          { status: 501, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "oura":
        // Use shared Oura token refresh utility
        const result = await getValidOuraToken(supabase, user_id);
        
        if (result.success) {
          console.log(`[wearable-token-refresh] [SUCCESS] Oura token validated/refreshed for user ${user_id}`);
          return new Response(
            JSON.stringify({
              success: true,
              message: "Oura token is valid",
              provider
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.error(`[wearable-token-refresh] [ERROR] Oura token refresh failed for user ${user_id}: ${result.error}`);
          return new Response(
            JSON.stringify({
              success: false,
              error: result.error,
              provider
            }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

      default:
        console.error(`[wearable-token-refresh] [ERROR] Unsupported provider: ${provider}`);
        return new Response(
          JSON.stringify({ error: `Unsupported provider: ${provider}`, success: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[wearable-token-refresh] [ERROR] Unhandled exception:", error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
