// Unified wearable diagnostics for Fitbit, Ōura, and future devices
// Checks token validity, sync status, and data freshness across all providers

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticRequest {
  user_id: string;
  provider?: "fitbit" | "oura" | "all";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, provider = "all" } = await req.json() as DiagnosticRequest;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const diagnostics: any = {
      user_id,
      timestamp: new Date().toISOString(),
      providers: {},
    };

    // Check Fitbit
    if (provider === "all" || provider === "fitbit") {
      diagnostics.providers.fitbit = await checkFitbitStatus(supabase, user_id);
    }

    // TODO: Add Oura diagnostics here later
    if (provider === "all" || provider === "oura") {
      diagnostics.providers.oura = await checkOuraStatus(supabase, user_id);
    }

    return new Response(
      JSON.stringify(diagnostics),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[wearable-diagnostics] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkFitbitStatus(supabase: any, userId: string) {
  // TODO: Implement Fitbit diagnostics
  // Check wearable_tokens, wearable_auto_data, wearable_sessions
  return {
    status: "not_implemented",
    message: "Fitbit diagnostics pending implementation"
  };
}

async function checkOuraStatus(supabase: any, userId: string) {
  // TODO: Implement Oura diagnostics
  // Check oura_tokens, oura_sync_log, wearable_sessions
  return {
    status: "not_configured",
    message: "Ōura diagnostics pending implementation"
  };
}
