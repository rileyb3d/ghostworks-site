import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

// Public endpoint that turns a client-supplied amount + description into a
// Stripe Checkout Session for one-off client invoice payments. Returns the
// hosted Stripe URL so the client redirects there.
//
// Webhook is the source of truth for "this got paid" — never trust the
// success redirect alone.

type CheckoutBody = {
  amount?: number; // dollars
  description?: string;
  email?: string;
  reference?: string; // optional invoice / project reference
};

const MIN_USD = 25;
const MAX_USD = 500_000;

export async function POST(req: Request) {
  let body: CheckoutBody;
  try {
    body = (await req.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const description = body.description?.trim();
  const email = body.email?.trim();
  const reference = body.reference?.trim();

  if (!Number.isFinite(amount) || amount < MIN_USD || amount > MAX_USD) {
    return NextResponse.json(
      { error: `Amount must be between $${MIN_USD} and $${MAX_USD.toLocaleString()}.` },
      { status: 400 },
    );
  }
  if (!description) {
    return NextResponse.json(
      { error: "Description is required." },
      { status: 400 },
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ??
    req.headers.get("origin") ??
    "http://localhost:3000";

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: description.slice(0, 250),
              ...(reference ? { metadata: { reference } } : {}),
            },
          },
        },
      ],
      metadata: {
        reference: reference ?? "",
        kind: "client_invoice",
      },
      success_url: `${origin}/pay/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pay`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a URL." },
        { status: 502 },
      );
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout create failed", err);
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 502 },
    );
  }
}
