import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { getOrCreateStripeCustomerId } from "@/lib/stripe-customer";

// Create a Stripe Billing Portal session for the signed-in user. The portal
// lets them manage payment methods, view all past invoices, update billing
// info, and cancel subscriptions — all hosted by Stripe.
//
// Protected by middleware (`/api/account(.*)` is in the protected matcher).
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const customerId = await getOrCreateStripeCustomerId(userId);
    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const session = await getStripe().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe portal session failed", err);
    return NextResponse.json(
      { error: "Could not open billing portal." },
      { status: 502 },
    );
  }
}
