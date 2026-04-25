import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";
import {
  getOrCreateStripeCustomerId,
  syncStripeCustomerFromClerk,
} from "@/lib/stripe-customer";

// Clerk webhook receiver. Wire this URL into Clerk dashboard -> Webhooks
// and copy the signing secret into CLERK_WEBHOOK_SIGNING_SECRET.
//
// On user.created we provision a Stripe customer so that invoices and
// subscriptions show up in /account from day one.
export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SIGNING_SECRET not configured" },
      { status: 500 },
    );
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const body = await req.text();
  let evt: WebhookEvent;
  try {
    evt = new Webhook(secret).verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Clerk webhook signature verification failed", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (evt.type) {
      case "user.created": {
        await getOrCreateStripeCustomerId(evt.data.id);
        console.log(`[clerk webhook] provisioned Stripe customer for ${evt.data.id}`);
        break;
      }
      case "user.updated": {
        const email =
          evt.data.email_addresses.find(
            (e) => e.id === evt.data.primary_email_address_id,
          )?.email_address ?? evt.data.email_addresses[0]?.email_address;
        const name =
          [evt.data.first_name, evt.data.last_name].filter(Boolean).join(" ") ||
          undefined;
        await syncStripeCustomerFromClerk(evt.data.id, { email, name });
        break;
      }
      case "user.deleted": {
        // Don't delete the Stripe customer — preserves payment history and
        // makes refunds / receipts still resolvable. Stripe lets us mark
        // them deleted via metadata if we ever care.
        console.log(`[clerk webhook] user.deleted ${evt.data.id}`);
        break;
      }
      default:
        console.log(`[clerk webhook] unhandled event ${evt.type}`);
    }
  } catch (err) {
    console.error("[clerk webhook] handler failed", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
