// Unified wearable data fetching for Ōura and future devices
// This function abstracts device-specific logic behind a provider variable

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WearableFetchRequest {
  user_id: string;
  provider: "oura"; // Device type
  date?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, provider = "oura", date } = await req.json() as WearableFetchRequest;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Route to appropriate provider handler
    switch (provider) {
      case "oura":
        // TODO: Add Oura integration here later
        // Should fetch from Oura API and insert into wearable_sessions
        return new Response(
          JSON.stringify({
            success: false,
            message: "Ōura integration pending setup",
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
    console.error("[wearable-fetch-data] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
