// ============================================================================
// Stripe webhook -> user_subscriptions  (SCAFFOLD)
// Writes with the service role (bypasses RLS). Users only READ their row.
//
// REQUIRED SECRETS (add in Supabase → Project Settings → Edge Functions):
//   STRIPE_SECRET_KEY          - your Stripe secret key (sk_live_… / sk_test_…)
//   STRIPE_WEBHOOK_SIGNING_SECRET - the "whsec_…" from the Stripe webhook endpoint
//   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)
//
// REQUIRED CONFIG:
//   Map your Stripe Price IDs -> plan tiers in PRICE_TO_TIER below.
// ============================================================================
import Stripe from "https://esm.sh/stripe@14?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2";

// TODO(billing): replace with your real Stripe Price IDs from the Stripe dashboard.
const PRICE_TO_TIER: Record<string, "pro" | "elite"> = {
  // "price_XXXXXXXXXXXX_pro":   "pro",
  // "price_XXXXXXXXXXXX_elite": "elite",
};

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SIGNING_SECRET") ?? "";
const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function upsert(userId: string, fields: Record<string, unknown>) {
  await supabase.from("user_subscriptions").upsert(
    { user_id: userId, provider: "stripe", updated_at: new Date().toISOString(), ...fields },
    { onConflict: "user_id" },
  );
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  // ── Verify signature ──────────────────────────────────────────────────────
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    if (!webhookSecret || !sig) throw new Error("Missing webhook secret or signature");
    event = await stripe.webhooks.constructEventAsync(raw, sig, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        // We pass the Supabase user id as client_reference_id when creating the session.
        const userId = s.client_reference_id;
        if (!userId) break;
        const priceId = (s as unknown as { line_items?: { data?: Array<{ price?: { id?: string } }> } })
          .line_items?.data?.[0]?.price?.id;
        const tier = priceId ? PRICE_TO_TIER[priceId] ?? "pro" : "pro";
        await upsert(userId, {
          tier, status: "active",
          provider_customer_id: (s.customer as string) ?? null,
          provider_subscription_id: (s.subscription as string) ?? null,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = (sub.metadata as Record<string, string> | null)?.supabase_user_id;
        if (!userId) break; // TODO(billing): set metadata.supabase_user_id at checkout
        const active = sub.status === "active" || sub.status === "trialing";
        const priceId = sub.items.data[0]?.price?.id;
        await upsert(userId, {
          tier: active ? (priceId ? PRICE_TO_TIER[priceId] ?? "pro" : "pro") : "free",
          status: sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          provider_subscription_id: sub.id,
        });
        break;
      }
      default:
        break;
    }
    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(`Handler error: ${(err as Error).message}`, { status: 500 });
  }
});
