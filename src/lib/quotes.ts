import { randomUUID } from "crypto";
import { list, del } from "@vercel/blob";
import { uploadToBlob } from "@/lib/blob-sync";
import { QUOTE_TERMS_VERSION } from "@/lib/quote-terms";

// Quote data model + Vercel Blob-backed persistence. We store two files
// per quote so we can both render the PDF on demand and re-list quotes
// later for history:
//   quotes/{id}.json — the structured quote data (this Quote object)
//   quotes/{id}.pdf  — the rendered PDF
// Storage is "public" but addressed by an unguessable UUID, mirroring
// the rest of the blob-stored assets in this codebase.

export type QuoteLineItem = {
  description: string;
  quantity: number;
  unitAmount: number; // minor units (cents for USD; treat JPY as zero-decimal)
};

export type Quote = {
  id: string;
  number: string; // human label, e.g. "Q-2026-0042"
  createdAt: number;
  validUntil: number;
  client: {
    name: string;
    business?: string;
    email: string;
  };
  project: {
    name: string;
    summary: string;
  };
  lineItems: QuoteLineItem[];
  subtotal: number;
  discount?: number; // minor units
  tax?: number; // minor units
  total: number;
  currency: string; // ISO 4217 lowercase
  notes?: string;
  termsVersion: string;
  pdfUrl: string;
};

const BLOB_PREFIX = "quotes/";

function jsonPath(id: string): string {
  return `${BLOB_PREFIX}${id}.json`;
}

function pdfPath(id: string): string {
  return `${BLOB_PREFIX}${id}.pdf`;
}

// Compute a year-scoped sequence number for a fresh quote. We look at
// existing JSON entries under quotes/ and grab the highest number from
// the current year. Concurrent creates can race; for v1 this is fine —
// a duplicate sequence isn't catastrophic, just visually awkward.
export async function nextQuoteNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${BLOB_PREFIX}`;
  let cursor: string | undefined;
  let highest = 0;
  const yearTag = `Q-${year}-`;

  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    for (const blob of page.blobs) {
      if (!blob.pathname.endsWith(".json")) continue;
      try {
        const res = await fetch(blob.url, { cache: "no-store" });
        if (!res.ok) continue;
        const q = (await res.json()) as Pick<Quote, "number">;
        if (q.number?.startsWith(yearTag)) {
          const n = parseInt(q.number.slice(yearTag.length), 10);
          if (Number.isFinite(n) && n > highest) highest = n;
        }
      } catch {
        // Ignore unreadable entries — don't let one bad blob block creation.
      }
    }
    cursor = page.cursor;
  } while (cursor);

  const next = String(highest + 1).padStart(4, "0");
  return `${yearTag}${next}`;
}

// Compute line totals + grand total from raw inputs. Pure — exposed so
// the UI can mirror the same numbers before submit.
export function computeTotals(
  lineItems: QuoteLineItem[],
  discount?: number,
  tax?: number,
): { subtotal: number; total: number } {
  const subtotal = lineItems.reduce(
    (sum, li) => sum + Math.max(0, Math.round(li.quantity * li.unitAmount)),
    0,
  );
  const total = Math.max(
    0,
    subtotal - (discount ?? 0) + (tax ?? 0),
  );
  return { subtotal, total };
}

type QuoteCreateInput = Omit<
  Quote,
  "id" | "number" | "createdAt" | "subtotal" | "total" | "termsVersion" | "pdfUrl"
> & {
  discount?: number;
  tax?: number;
};

// Persist a new quote: write metadata JSON + render+upload the PDF, then
// re-write the JSON with the PDF URL stamped in.
export async function createQuote(
  input: QuoteCreateInput,
  renderPdf: (q: Quote) => Promise<Buffer | Uint8Array>,
): Promise<Quote> {
  const id = randomUUID();
  const number = await nextQuoteNumber();
  const { subtotal, total } = computeTotals(
    input.lineItems,
    input.discount,
    input.tax,
  );

  const quote: Quote = {
    id,
    number,
    createdAt: Date.now(),
    validUntil: input.validUntil,
    client: input.client,
    project: input.project,
    lineItems: input.lineItems,
    subtotal,
    discount: input.discount,
    tax: input.tax,
    total,
    currency: input.currency,
    notes: input.notes,
    termsVersion: QUOTE_TERMS_VERSION,
    pdfUrl: "",
  };

  const pdfBytes = await renderPdf(quote);
  const buf =
    pdfBytes instanceof Uint8Array && !(pdfBytes instanceof Buffer)
      ? Buffer.from(pdfBytes)
      : (pdfBytes as Buffer);
  const pdfBlob = await uploadToBlob(pdfPath(id), buf, {
    contentType: "application/pdf",
  });
  quote.pdfUrl = pdfBlob.url;

  await uploadToBlob(
    jsonPath(id),
    Buffer.from(JSON.stringify(quote, null, 2), "utf8"),
    { contentType: "application/json" },
  );

  return quote;
}

export async function listQuotes(limit = 200): Promise<Quote[]> {
  const prefix = BLOB_PREFIX;
  const out: Quote[] = [];
  let cursor: string | undefined;
  while (out.length < limit) {
    const page = await list({ prefix, cursor, limit: 1000 });
    const jsons = page.blobs.filter((b) => b.pathname.endsWith(".json"));
    const fetched = await Promise.all(
      jsons.map(async (b) => {
        try {
          const res = await fetch(b.url, { cache: "no-store" });
          if (!res.ok) return null;
          return (await res.json()) as Quote;
        } catch {
          return null;
        }
      }),
    );
    for (const q of fetched) {
      if (q) out.push(q);
    }
    cursor = page.cursor;
    if (!cursor) break;
  }
  out.sort((a, b) => b.createdAt - a.createdAt);
  return out.slice(0, limit);
}

export async function getQuote(id: string): Promise<Quote | null> {
  const page = await list({ prefix: jsonPath(id), limit: 1 });
  const target = page.blobs.find((b) => b.pathname === jsonPath(id));
  if (!target) return null;
  try {
    const res = await fetch(target.url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Quote;
  } catch {
    return null;
  }
}

export async function deleteQuote(id: string): Promise<void> {
  // Resolve actual blob URLs first — del() takes URLs, not pathnames.
  const page = await list({ prefix: BLOB_PREFIX, limit: 1000 });
  const targets = page.blobs.filter(
    (b) => b.pathname === jsonPath(id) || b.pathname === pdfPath(id),
  );
  for (const t of targets) {
    try {
      await del(t.url);
    } catch (err) {
      console.error(`Failed to delete blob ${t.pathname}`, err);
    }
  }
}
