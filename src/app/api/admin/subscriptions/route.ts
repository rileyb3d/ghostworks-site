import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { Resend } from "resend";
import { getStripe } from "@/lib/stripe";
import { isCurrentUserAdmin } from "@/lib/admin";

// Admin-only endpoint to start a recurring subscription that auto-charges a
// saved card every cycle. We don't create the Subscription directly because
// that requires a payment method on file. Instead we create a Checkout
// Session in `mode: "subscription"` — the customer enters card details on
// Stripe's hosted page, and from then on Stripe auto-charges that card on
// the configured cadence. Failed payments retry automatically per Stripe's
// dunning settings, and the customer can update the card or cancel via the
// existing Manage Billing portal on /account.

type Body = {
  email?: string;
  name?: string;
  amount?: number; // dollars per cycle
  description?: string;
  interval?: "day" | "week" | "month" | "year";
  intervalCount?: number;
};

const MIN_USD = 1;
const MAX_USD = 500_000;
const ALLOWED_INTERVALS: ReadonlyArray<"day" | "week" | "month" | "year"> = [
  "day",
  "week",
  "month",
  "year",
];

function intervalSummary(
  interval: "day" | "week" | "month" | "year",
  intervalCount: number,
): string {
  if (intervalCount === 1) return `every ${interval}`;
  return `every ${intervalCount} ${interval}s`;
}

async function emailSetupLink(args: {
  to: string;
  name?: string;
  description: string;
  amount: number;
  intervalSummary: string;
  url: string;
}): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      sent: false,
      error: "Resend / from-email not configured (RESEND_API_KEY, CONTACT_FROM_EMAIL)",
    };
  }

  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(args.amount);

  const greeting = args.name ? `Hi ${args.name},` : "Hi,";
  const subject = `Set up your ${args.description} subscription`;
  const text = [
    greeting,
    "",
    `You've been invited to start a recurring payment for: ${args.description}.`,
    `Amount: ${formattedAmount} ${args.intervalSummary}.`,
    "",
    "Click the link below to enter your card details. Your card will then be charged automatically each cycle. You can update your card or cancel anytime from your account.",
    "",
    args.url,
    "",
    "— Ghostworks",
  ].join("\n");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [args.to],
    subject,
    text,
  });

  if (error) {
    console.error("Resend send failed", error);
    return { sent: false, error: "Failed to email setup link." };
  }
  return { sent: true };
}

export async function POST(req: Request) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const name = body.name?.trim() || undefined;
  const amount = Number(body.amount);
  const description = body.description?.trim();
  const interval = body.interval;
  const intervalCount = Number.isFinite(body.intervalCount)
    ? Math.max(1, Math.min(52, Number(body.intervalCount)))
    : 1;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < MIN_USD || amount > MAX_USD) {
    return NextResponse.json(
      { error: `Amount must be between $${MIN_USD} and $${MAX_USD.toLocaleString()}.` },
      { status: 400 },
    );
  }
  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }
  if (!interval || !ALLOWED_INTERVALS.includes(interval)) {
    return NextResponse.json({ error: "Invalid billing interval." }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    "http://localhost:3000";

  try {
    const stripe = getStripe();

    let customer: Stripe.Customer;
    const found = await stripe.customers.list({ email, limit: 1 });
    if (found.data[0]) {
      customer = found.data[0];
      if (name && customer.name !== name) {
        customer = await stripe.customers.update(customer.id, { name });
      }
    } else {
      customer = await stripe.customers.create({ email, name });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: { name: description },
            unit_amount: Math.round(amount * 100),
            recurring: { interval, interval_count: intervalCount },
          },
        },
      ],
      metadata: {
        kind: "admin_subscription",
        description,
      },
      success_url: `${origin}/pay/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a Checkout URL." },
        { status: 502 },
      );
    }

    const emailResult = await emailSetupLink({
      to: email,
      name,
      description,
      amount,
      intervalSummary: intervalSummary(interval, intervalCount),
      url: session.url,
    });

    return NextResponse.json({
      ok: true,
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      customerId: customer.id,
      emailSent: emailResult.sent,
      emailError: emailResult.error ?? null,
    });
  } catch (err) {
    console.error("Admin subscription create failed", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Stripe error: ${detail}` }, { status: 502 });
  }
}
