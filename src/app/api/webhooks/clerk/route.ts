import { NextResponse } from "next/server";
import { Webhook } from "svix";
import type { WebhookEvent } from "@clerk/nextjs/server";

// Clerk webhook receiver. Wire this URL into Clerk dashboard -> Webhooks
// and copy the signing secret into CLERK_WEBHOOK_SIGNING_SECRET.
//
// Today this is a stub: we just verify and log. When we add a user store
// (DB, KV, etc.) extend the switch below to mirror user create/update/delete.
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

  switch (evt.type) {
    case "user.created":
    case "user.updated":
    case "user.deleted":
      // TODO: sync to user store once one exists.
      console.log(`[clerk webhook] ${evt.type}`, evt.data.id);
      break;
    default:
      console.log(`[clerk webhook] unhandled event ${evt.type}`);
  }

  return NextResponse.json({ ok: true });
}
