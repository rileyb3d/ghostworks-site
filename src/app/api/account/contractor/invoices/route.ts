import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { submitContractorInvoice } from "@/lib/contractor";
import { readPublicMeta } from "@/lib/users";

// Contractor-facing: submit a new timesheet/invoice for admin review.
// Persisted on the user's own privateMetadata; admin sees it via the
// /admin/payouts page.

type Body = {
  amount?: number; // major units, e.g. 250.00 = $250
  currency?: string;
  description?: string;
  hours?: number;
};

const MIN_AMOUNT = 1; // major units
const MAX_AMOUNT = 100_000;
const DESC_MAX = 250;
const VALID_CURRENCIES = new Set([
  "usd",
  "cad",
  "eur",
  "gbp",
  "aud",
  "nzd",
  "chf",
  "jpy",
]);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const pub = readPublicMeta(user);
  if (!pub.isContractor) {
    return NextResponse.json(
      { error: "Only contractors can submit invoices." },
      { status: 403 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const currency = String(body.currency ?? "usd").toLowerCase();
  const description = String(body.description ?? "").trim();
  const hours =
    body.hours === undefined || body.hours === null
      ? undefined
      : Number(body.hours);

  if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
    return NextResponse.json(
      {
        error: `Amount must be between ${MIN_AMOUNT} and ${MAX_AMOUNT.toLocaleString()}.`,
      },
      { status: 400 },
    );
  }
  if (!VALID_CURRENCIES.has(currency)) {
    return NextResponse.json(
      { error: `Unsupported currency: ${currency}` },
      { status: 400 },
    );
  }
  if (!description || description.length > DESC_MAX) {
    return NextResponse.json(
      { error: `Description is required (max ${DESC_MAX} chars).` },
      { status: 400 },
    );
  }
  if (hours !== undefined && (!Number.isFinite(hours) || hours < 0 || hours > 10_000)) {
    return NextResponse.json(
      { error: "Hours must be a positive number." },
      { status: 400 },
    );
  }

  // JPY is a zero-decimal currency (Stripe). Everything else we accept is
  // two-decimal. Be conservative and convert by *100 unless it's JPY.
  const minor =
    currency === "jpy" ? Math.round(amount) : Math.round(amount * 100);

  try {
    const entry = await submitContractorInvoice(userId, {
      amount: minor,
      currency,
      description,
      hours,
    });
    return NextResponse.json({ ok: true, invoice: entry });
  } catch (err) {
    console.error(`POST /api/account/contractor/invoices failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
