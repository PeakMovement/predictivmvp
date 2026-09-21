import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/easkd2f6r5ancayqfs9qx4fh4gigd7di";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { user_id, email, username, account_type } = await req.json();

    if (!user_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signed_up_at = new Date().toISOString();

    let makeStatus = 0;
    let makeBody = "";
    let makeSuccess = false;

    try {
      const makeRes = await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id,
          email,
          username: username || "",
          account_type: account_type || "user",
          signed_up_at,
        }),
      });

      makeStatus = makeRes.status;
      makeBody = await makeRes.text();
      makeSuccess = makeRes.ok;

      if (!makeRes.ok) {
        console.error(`[notify-signup] Make.com returned ${makeStatus}: ${makeBody}`);
      } else {
        console.log(`[notify-signup] Make.com accepted webhook (${makeStatus}): ${makeBody}`);
      }
    } catch (makeErr) {
      console.error("[notify-signup] Failed to reach Make.com:", makeErr);
      makeBody = makeErr instanceof Error ? makeErr.message : String(makeErr);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: logError } = await supabase.from("notification_log").insert({
      recipient: user_id,
      message: `[signup] Welcome email triggered for ${email} (${account_type || "user"}) — Make status: ${makeStatus || "network-error"} body: ${makeBody}`,
      status: makeSuccess ? "sent" : "failed",
    });

    if (logError) {
      console.error("[notify-signup] Failed to write notification_log:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, make_status: makeStatus, make_ok: makeSuccess }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[notify-signup] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
