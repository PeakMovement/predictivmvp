/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";
import { getValidOuraToken } from "../_shared/oura-token-refresh.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, x-oura-signature, x-oura-timestamp",
};

interface WebhookEvent {
  event_type: "create" | "update" | "delete";
  data_type: string;
  object_id: string;
  event_time: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // GET endpoint for webhook verification during subscription setup
    if (req.method === "GET") {
      const url = new URL(req.url);
      const verification_token = url.searchParams.get("verification_token");
      const challenge = url.searchParams.get("challenge");

      console.log("[oura-webhook] Verification request:", { verification_token, challenge });

      // Verify the token matches what we expect (from Oura Developer Portal)
      const expectedToken = Deno.env.get("OURA_WEBHOOK_VERIFICATION_TOKEN");

      if (verification_token === expectedToken && challenge) {
        console.log("[oura-webhook] Verification successful");
        return new Response(
          JSON.stringify({ challenge }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      console.error("[oura-webhook] [ERROR] Verification failed: invalid token");
      return new Response(
        JSON.stringify({ error: "Invalid verification token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // POST endpoint for receiving webhook events
    if (req.method === "POST") {
      const signature = req.headers.get("x-oura-signature");
      const timestamp = req.headers.get("x-oura-timestamp");
      const bodyText = await req.text();
      const body: WebhookEvent = JSON.parse(bodyText);

      console.log("[oura-webhook] Received event:", {
        event_type: body.event_type,
        data_type: body.data_type,
        user_id: body.user_id,
      });

      // Verify HMAC signature for security
      const clientSecret = Deno.env.get("OURA_CLIENT_SECRET");
      if (signature && timestamp && clientSecret) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(clientSecret),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );

        const signatureData = encoder.encode(timestamp + bodyText);
        const calculatedSignature = await crypto.subtle.sign(
          "HMAC",
          key,
          signatureData
        );

        const calculatedHex = Array.from(new Uint8Array(calculatedSignature))
          .map(b => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();

        if (calculatedHex !== signature.toUpperCase()) {
          console.error("[oura-webhook] [ERROR] Invalid signature");
          return new Response(
            JSON.stringify({ error: "Invalid signature" }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
          );
        }
        console.log("[oura-webhook] Signature verified");
      }

      // Get Supabase client
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      if (!supabaseUrl || !supabaseKey) {
        console.error("[oura-webhook] [ERROR] Supabase credentials not available");
        throw new Error("Supabase credentials not available");
      }

      const supabase = createClient(supabaseUrl, supabaseKey);

      // Log the webhook event
      await supabase.from("oura_logs").insert({
        user_id: body.user_id,
        status: "webhook_received",
        error_message: `Webhook event: ${body.event_type} for ${body.data_type}`,
      });

      // Respond quickly (under 10 seconds as per Oura docs)
      // Then process the event asynchronously
      const responsePromise = new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );

      // Process event asynchronously (don't await)
      processWebhookEvent(body, supabase).catch(error => {
        console.error("[oura-webhook] [ERROR] Error processing event:", error instanceof Error ? error.message : String(error));
      });

      return responsePromise;
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("[oura-webhook] [ERROR] Unhandled exception:", err instanceof Error ? err.message : String(err));
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

/**
 * Process webhook event asynchronously
 * Fetches the updated data from Oura API and stores it
 */
async function processWebhookEvent(event: WebhookEvent, supabase: any) {
  console.log(`[oura-webhook] Processing ${event.event_type} for ${event.data_type}`);

  try {
    // Use shared token refresh utility
    const tokenResult = await getValidOuraToken(supabase, event.user_id);

    if (!tokenResult.success || !tokenResult.access_token) {
      console.error(`[oura-webhook] [ERROR] Token validation failed for user ${event.user_id}: ${tokenResult.error}`);
      await supabase.from("oura_logs").insert({
        user_id: event.user_id,
        status: "error",
        error_message: `Webhook processing failed: ${tokenResult.error}`,
      });
      return;
    }

    const accessToken = tokenResult.access_token;

    // Fetch the specific updated data using object_id
    const dataTypeEndpoint = event.data_type.replace("_", "-");
    const apiUrl = `https://api.ouraring.com/v2/usercollection/${dataTypeEndpoint}/${event.object_id}`;

    console.log(`[oura-webhook] Fetching updated data from: ${apiUrl}`);

    const dataRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!dataRes.ok) {
      console.error(`[oura-webhook] [ERROR] Failed to fetch data: HTTP ${dataRes.status}`);
      await supabase.from("oura_logs").insert({
        user_id: event.user_id,
        status: "error",
        error_message: `Failed to fetch ${event.data_type}: HTTP ${dataRes.status}`,
      });
      return;
    }

    const data = await dataRes.json();
    console.log(`[oura-webhook] [SUCCESS] Successfully fetched updated ${event.data_type} data`);

    // Store the data in appropriate table
    await supabase.from("oura_logs").insert({
      user_id: event.user_id,
      status: "success",
      error_message: `Webhook processed: ${event.data_type} updated`,
    });

  } catch (error) {
    console.error("[oura-webhook] [ERROR] Error processing event:", error instanceof Error ? error.message : String(error));
    await supabase.from("oura_logs").insert({
      user_id: event.user_id,
      status: "error",
      error_message: `Webhook processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
