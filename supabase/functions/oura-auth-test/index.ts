import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const diagnostics: Record<string, unknown> = {};

    // Check environment variables
    diagnostics.env = {
      OURA_CLIENT_ID: !!Deno.env.get("OURA_CLIENT_ID"),
      OURA_CLIENT_SECRET: !!Deno.env.get("OURA_CLIENT_SECRET"),
      SUPABASE_URL: !!Deno.env.get("SUPABASE_URL"),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      SUPABASE_URL_VALUE: Deno.env.get("SUPABASE_URL") || "MISSING",
    };

    // Test Supabase client creation
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      diagnostics.supabase_client = "FAILED - Missing credentials";
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      diagnostics.supabase_client = "SUCCESS - Client created";

      // Test database access
      try {
        const { data, error } = await supabase
          .from("oura_tokens")
          .select("user_id")
          .limit(0);

        if (error) {
          diagnostics.database_access = `FAILED - ${error.message}`;
        } else {
          diagnostics.database_access = "SUCCESS - Table accessible";
        }
      } catch (err) {
        diagnostics.database_access = `ERROR - ${err instanceof Error ? err.message : String(err)}`;
      }
    }

    // Test Oura API connectivity
    diagnostics.oura_api = "Not tested - requires valid code";

    return new Response(
      JSON.stringify({
        success: true,
        diagnostics,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[oura-auth-test] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
