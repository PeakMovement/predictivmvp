/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "npm:@supabase/supabase-js@2";

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

      console.error("[oura-webhook] Verification failed: invalid token");
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
          console.error("[oura-webhook] Invalid signature");
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
        console.error("[oura-webhook] Error processing event:", error);
      });

      return responsePromise;
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error("[oura-webhook] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error"
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
    // Get user's access token
    const { data: tokenData, error: tokenError } = await supabase
      .from("oura_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", event.user_id)
      .maybeSingle();

    if (tokenError || !tokenData) {
      console.error("[oura-webhook] No token found for user:", event.user_id);
      return;
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    if (new Date(tokenData.expires_at) < new Date()) {
      console.log("[oura-webhook] Token expired, refreshing...");

      const refreshRes = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: tokenData.refresh_token,
          client_id: Deno.env.get("OURA_CLIENT_ID")!,
          client_secret: Deno.env.get("OURA_CLIENT_SECRET")!,
        }),
      });

      if (!refreshRes.ok) {
        console.error("[oura-webhook] Token refresh failed");
        return;
      }

      const refreshed = await refreshRes.json();
      accessToken = refreshed.access_token;

      // Update token in database
      await supabase.from("oura_tokens").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? tokenData.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("user_id", event.user_id);
    }

    // Fetch the specific updated data using object_id
    const dataTypeEndpoint = event.data_type.replace("_", "-");
    const apiUrl = `https://api.ouraring.com/v2/usercollection/${dataTypeEndpoint}/${event.object_id}`;

    console.log(`[oura-webhook] Fetching updated data from: ${apiUrl}`);

    const dataRes = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!dataRes.ok) {
      console.error(`[oura-webhook] Failed to fetch data: ${dataRes.status}`);
      return;
    }

    const data = await dataRes.json();
    console.log(`[oura-webhook] Successfully fetched updated ${event.data_type} data`);

    // Store the data in appropriate table
    // This would need to be customized based on your data model
    // For now, just log success
    await supabase.from("oura_logs").insert({
      user_id: event.user_id,
      status: "success",
      error_message: `Webhook processed: ${event.data_type} updated`,
    });

  } catch (error) {
    console.error("[oura-webhook] Error processing event:", error);
    await supabase.from("oura_logs").insert({
      user_id: event.user_id,
      status: "error",
      error_message: `Webhook processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
