import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createQuote, listQuotes } from "@/lib/quotes";
import type { QuoteLineItem } from "@/lib/quotes";
import { renderQuotePdf } from "@/lib/pdf/QuotePdf";

// Admin-only: list past quotes / create a new one. POST renders the
// PDF inline and uploads it to Vercel Blob; the returned quote includes
// the stable pdfUrl.

type Body = {
  client?: {
    name?: string;
    business?: string;
    email?: string;
  };
  project?: {
    name?: string;
    summary?: string;
  };
  lineItems?: Array<{
    description?: string;
    quantity?: number;
    unitAmount?: number; // major units e.g. 2500.00
  }>;
  currency?: string;
  discount?: number; // major units
  tax?: number; // major units
  notes?: string;
  validUntil?: number; // ms epoch
  validDays?: number; // alt: days from today
};

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
const MAX_LINE_ITEMS = 50;

function toMinor(currency: string, major: number): number {
  if (!Number.isFinite(major)) return 0;
  return currency === "jpy" ? Math.round(major) : Math.round(major * 100);
}

export async function GET() {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const quotes = await listQuotes(200);
    return NextResponse.json({ ok: true, quotes });
  } catch (err) {
    console.error("Failed to list quotes", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
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

  const clientName = body.client?.name?.trim();
  const clientEmail = body.client?.email?.trim().toLowerCase();
  const clientBusiness = body.client?.business?.trim() || undefined;
  const projectName = body.project?.name?.trim();
  const projectSummary = body.project?.summary?.trim();
  const currency = String(body.currency ?? "usd").toLowerCase();
  const rawLineItems = Array.isArray(body.lineItems) ? body.lineItems : [];

  if (!clientName) {
    return NextResponse.json(
      { error: "Client name is required." },
      { status: 400 },
    );
  }
  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) {
    return NextResponse.json(
      { error: "Valid client email is required." },
      { status: 400 },
    );
  }
  if (!projectName) {
    return NextResponse.json(
      { error: "Project name is required." },
      { status: 400 },
    );
  }
  if (!projectSummary) {
    return NextResponse.json(
      { error: "Project summary is required." },
      { status: 400 },
    );
  }
  if (!VALID_CURRENCIES.has(currency)) {
    return NextResponse.json(
      { error: `Unsupported currency: ${currency}` },
      { status: 400 },
    );
  }
  if (rawLineItems.length === 0) {
    return NextResponse.json(
      { error: "Add at least one line item." },
      { status: 400 },
    );
  }
  if (rawLineItems.length > MAX_LINE_ITEMS) {
    return NextResponse.json(
      { error: `Too many line items (max ${MAX_LINE_ITEMS}).` },
      { status: 400 },
    );
  }

  const lineItems: QuoteLineItem[] = [];
  for (const [i, li] of rawLineItems.entries()) {
    const desc = (li.description ?? "").trim();
    const qty = Number(li.quantity ?? 1);
    const unitMajor = Number(li.unitAmount ?? 0);
    if (!desc) {
      return NextResponse.json(
        { error: `Line item ${i + 1}: description required.` },
        { status: 400 },
      );
    }
    if (!Number.isFinite(qty) || qty <= 0 || qty > 100_000) {
      return NextResponse.json(
        { error: `Line item ${i + 1}: invalid quantity.` },
        { status: 400 },
      );
    }
    if (!Number.isFinite(unitMajor) || unitMajor < 0 || unitMajor > 1_000_000) {
      return NextResponse.json(
        { error: `Line item ${i + 1}: invalid unit amount.` },
        { status: 400 },
      );
    }
    lineItems.push({
      description: desc.slice(0, 250),
      quantity: qty,
      unitAmount: toMinor(currency, unitMajor),
    });
  }

  const discount =
    body.discount != null && Number.isFinite(Number(body.discount))
      ? toMinor(currency, Number(body.discount))
      : undefined;
  const tax =
    body.tax != null && Number.isFinite(Number(body.tax))
      ? toMinor(currency, Number(body.tax))
      : undefined;

  const now = Date.now();
  const validUntil =
    body.validUntil && Number.isFinite(body.validUntil)
      ? Number(body.validUntil)
      : now +
        (Number.isFinite(body.validDays) ? Number(body.validDays) : 30) *
          24 *
          60 *
          60 *
          1000;

  try {
    const quote = await createQuote(
      {
        client: {
          name: clientName,
          email: clientEmail,
          business: clientBusiness,
        },
        project: {
          name: projectName,
          summary: projectSummary,
        },
        lineItems,
        discount,
        tax,
        currency,
        notes: body.notes?.trim() || undefined,
        validUntil,
      },
      renderQuotePdf,
    );
    return NextResponse.json({ ok: true, quote });
  } catch (err) {
    console.error("Failed to create quote", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
