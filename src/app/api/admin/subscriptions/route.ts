import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { isCurrentUserAdmin } from "@/lib/admin";

// Admin-only endpoint to start a recurring subscription for a customer.
// Uses send_invoice collection so the customer receives an emailed hosted
// invoice each cycle (no card on file required up front). Inline price_data
// keeps us from having to manage Products / Prices in the dashboard.

type Body = {
  email?: string;
  name?: string;
  amount?: number; // dollars per cycle
  description?: string;
  interval?: "day" | "week" | "month" | "year";
  intervalCount?: number;
  daysUntilDue?: number;
};

const MIN_USD = 1;
const MAX_USD = 500_000;
const ALLOWED_INTERVALS: ReadonlyArray<"day" | "week" | "month" | "year"> = [
  "day",
  "week",
  "month",
  "year",
];

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
  const daysUntilDue = Number.isFinite(body.daysUntilDue)
    ? Math.max(0, Math.min(365, Number(body.daysUntilDue)))
    : 14;

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

    // Stripe subscriptions require an existing Product to hang the Price on
    // (unlike one-off Checkout where product_data can be inline). Create a
    // fresh Product per subscription so the description shows up cleanly on
    // invoices and in the Stripe dashboard.
    const product = await stripe.products.create({
      name: description,
      metadata: { kind: "admin_subscription", clerkAdmin: "true" },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      collection_method: "send_invoice",
      days_until_due: daysUntilDue,
      description,
      items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product: product.id,
            recurring: { interval, interval_count: intervalCount },
          },
        },
      ],
      expand: ["latest_invoice"],
    });

    const latestInvoice =
      typeof subscription.latest_invoice === "object" && subscription.latest_invoice
        ? subscription.latest_invoice
        : null;

    return NextResponse.json({
      ok: true,
      subscriptionId: subscription.id,
      customerId: customer.id,
      firstInvoiceId: latestInvoice?.id ?? null,
      firstInvoiceHostedUrl: latestInvoice?.hosted_invoice_url ?? null,
      firstInvoicePdf: latestInvoice?.invoice_pdf ?? null,
    });
  } catch (err) {
    console.error("Admin subscription create failed", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Stripe error: ${detail}` }, { status: 502 });
  }
}
