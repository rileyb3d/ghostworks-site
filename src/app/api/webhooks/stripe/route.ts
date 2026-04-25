import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";

// Stripe webhook receiver. Configure in Stripe dashboard -> Webhooks pointing
// at <APP_URL>/api/webhooks/stripe and copy the signing secret into
// STRIPE_WEBHOOK_SECRET.
//
// Use this as the source of truth for "this invoice was paid" — never trust
// the success redirect alone.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not configured" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature failed", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      console.log("[stripe webhook] checkout.session.completed", {
        id: session.id,
        amount_total: session.amount_total,
        reference: session.metadata?.reference,
        email: session.customer_details?.email,
      });
      // TODO: mark invoice paid in our store, send receipt via Resend, etc.
      break;
    }
    case "checkout.session.expired":
    case "payment_intent.payment_failed":
      console.log(`[stripe webhook] ${event.type}`, event.data.object.id);
      break;
    default:
      console.log(`[stripe webhook] unhandled ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
