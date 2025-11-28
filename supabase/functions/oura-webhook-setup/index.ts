import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Oura Webhook Setup Function
 *
 * This function helps set up webhook subscriptions with Oura API.
 * Per Oura documentation, webhooks are the PREFERRED way to consume data.
 *
 * Required environment variables:
 * - OURA_CLIENT_ID: Your Oura application client ID
 * - OURA_CLIENT_SECRET: Your Oura application client secret
 * - OURA_WEBHOOK_VERIFICATION_TOKEN: A secret token you choose for webhook verification
 *
 * Webhook endpoint URL should be:
 * https://[your-project-id].supabase.co/functions/v1/oura-webhook
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, subscription_id, data_type, event_type } = await req.json();

    const clientId = Deno.env.get("OURA_CLIENT_ID");
    const clientSecret = Deno.env.get("OURA_CLIENT_SECRET");
    const verificationToken = Deno.env.get("OURA_WEBHOOK_VERIFICATION_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    if (!clientId || !clientSecret) {
      throw new Error("Oura credentials not configured");
    }

    if (!verificationToken) {
      throw new Error("OURA_WEBHOOK_VERIFICATION_TOKEN not set. Please configure a secret verification token.");
    }

    if (!supabaseUrl) {
      throw new Error("SUPABASE_URL not available");
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/oura-webhook`;

    // LIST subscriptions
    if (action === "list") {
      const res = await fetch("https://api.ouraring.com/v2/webhook/subscription", {
        method: "GET",
        headers: {
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
        },
      });

      const data = await res.json();
      return new Response(
        JSON.stringify({
          success: true,
          subscriptions: data,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // CREATE subscription
    if (action === "create") {
      if (!data_type || !event_type) {
        throw new Error("data_type and event_type are required for creating subscription");
      }

      const res = await fetch("https://api.ouraring.com/v2/webhook/subscription", {
        method: "POST",
        headers: {
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          callback_url: webhookUrl,
          verification_token: verificationToken,
          event_type,
          data_type,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(`Failed to create subscription: ${JSON.stringify(responseData)}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscription: responseData,
          message: `Webhook subscription created for ${event_type} ${data_type}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // DELETE subscription
    if (action === "delete") {
      if (!subscription_id) {
        throw new Error("subscription_id is required for deleting subscription");
      }

      const res = await fetch(`https://api.ouraring.com/v2/webhook/subscription/${subscription_id}`, {
        method: "DELETE",
        headers: {
          "x-client-id": clientId,
          "x-client-secret": clientSecret,
        },
      });

      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to delete subscription: ${errorData}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Subscription ${subscription_id} deleted`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // CREATE ALL recommended subscriptions
    if (action === "setup_all") {
      const dataTypes = [
        "daily_sleep",
        "daily_readiness",
        "daily_activity",
        "daily_spo2",
        "daily_stress",
        "daily_resilience",
        "sleep",
        "workout",
        "session",
        "tag",
      ];

      const results = [];
      const errors = [];

      // Create subscriptions for "update" events (most common)
      for (const dataType of dataTypes) {
        try {
          const res = await fetch("https://api.ouraring.com/v2/webhook/subscription", {
            method: "POST",
            headers: {
              "x-client-id": clientId,
              "x-client-secret": clientSecret,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              callback_url: webhookUrl,
              verification_token: verificationToken,
              event_type: "update",
              data_type: dataType,
            }),
          });

          const data = await res.json();

          if (res.ok) {
            results.push({ data_type: dataType, event_type: "update", status: "created", id: data.id });
          } else {
            errors.push({ data_type: dataType, event_type: "update", error: data });
          }
        } catch (error) {
          errors.push({
            data_type: dataType,
            event_type: "update",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return new Response(
        JSON.stringify({
          success: errors.length === 0,
          created: results.length,
          subscriptions: results,
          errors,
          message: `Created ${results.length} webhook subscriptions${errors.length > 0 ? ` with ${errors.length} errors` : ""}`,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    throw new Error(`Unknown action: ${action}. Valid actions: list, create, delete, setup_all`);

  } catch (err) {
    console.error("[oura-webhook-setup] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
