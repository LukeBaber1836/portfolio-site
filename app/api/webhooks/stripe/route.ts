import type Stripe from "stripe";

import { env } from "@/lib/env";
import { handleStripeEvent } from "@/lib/services/invoice-sync";
import { stripe } from "@/lib/stripe/client";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature || !env.STRIPE_WEBHOOK_SECRET) {
    return new Response("Webhook not configured", { status: 400 });
  }

  // Signature verification needs the exact raw body.
  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn("[stripe webhook] bad signature", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch {
    // 500 → Stripe retries with backoff; handler is idempotent.
    return new Response("Processing failed", { status: 500 });
  }
}
