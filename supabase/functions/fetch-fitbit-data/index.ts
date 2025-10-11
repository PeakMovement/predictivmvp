import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { status: 200, headers: corsHeaders });

  try {
    const { access_token } = await req.json();
    if (!access_token) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing access token" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const res = await fetch("https://api.fitbit.com/1/user/-/activities/date/today.json", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ success: false, data }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { error } = await supabase
      .from("fitbit_data")
      .insert([{ fetched_at: new Date().toISOString(), data }]);

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: "Fitbit data synced", data }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Fetch Fitbit error:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
