import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { isCurrentUserAdmin } from "@/lib/admin";

// Admin-only endpoint to issue a Stripe invoice to a customer by email.
// Creates the customer if one doesn't exist, attaches a single line item,
// finalizes, and (optionally) emails the hosted invoice link to the client.
//
// Webhook is still source of truth for "this got paid" — we just create
// the invoice here.

type Body = {
  email?: string;
  name?: string;
  amount?: number; // dollars
  description?: string;
  send?: boolean; // default true: email the invoice; false = finalize only
  daysUntilDue?: number; // default 14
};

const MIN_USD = 1;
const MAX_USD = 500_000;

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
  const send = body.send !== false;
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

    await stripe.invoiceItems.create({
      customer: customer.id,
      currency: "usd",
      amount: Math.round(amount * 100),
      description,
    });

    // Recent Stripe API versions don't auto-attach pending invoice items to
    // new invoices — without `pending_invoice_items_behavior: "include"` the
    // invoice gets finalized at $0 and the item is left orphaned on the
    // customer.
    const collectionMethod: Stripe.InvoiceCreateParams.CollectionMethod =
      "send_invoice";
    let invoice = await stripe.invoices.create({
      customer: customer.id,
      collection_method: collectionMethod,
      days_until_due: daysUntilDue,
      description,
      auto_advance: false,
      pending_invoice_items_behavior: "include",
    });

    invoice = await stripe.invoices.finalizeInvoice(invoice.id as string);

    if (send) {
      invoice = await stripe.invoices.sendInvoice(invoice.id as string);
    }

    return NextResponse.json({
      ok: true,
      invoiceId: invoice.id,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      customerId: customer.id,
      sent: send,
    });
  } catch (err) {
    console.error("Admin invoice create failed", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Stripe error: ${detail}` }, { status: 502 });
  }
}
