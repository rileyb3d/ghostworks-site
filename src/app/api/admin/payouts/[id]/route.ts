import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  approveAndPayInvoice,
  rejectContractorInvoice,
} from "@/lib/contractor";

// Admin: act on a single contractor invoice. The invoice ID alone is
// not enough — we also need the owning userId since invoices are stored
// on the contractor's Clerk metadata, not in a flat table. Pass userId
// as a query param: /api/admin/payouts/[invoiceId]?userId=...
//
// POST  -> approve and immediately transfer funds (Stripe transfer)
// DELETE -> reject (no money movement)

function readUserId(req: Request): string | null {
  const url = new URL(req.url);
  return url.searchParams.get("userId");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const userId = readUserId(req);
  if (!id || !userId) {
    return NextResponse.json(
      { error: "Invoice id and userId are required." },
      { status: 400 },
    );
  }

  try {
    const { invoice, transfer } = await approveAndPayInvoice(userId, id);
    return NextResponse.json({
      ok: true,
      invoice,
      transferId: transfer.id,
    });
  } catch (err) {
    console.error(`POST /api/admin/payouts/${id} failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const userId = readUserId(req);
  if (!id || !userId) {
    return NextResponse.json(
      { error: "Invoice id and userId are required." },
      { status: 400 },
    );
  }

  let reason: string | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as { reason?: string };
    reason = body.reason?.trim() || undefined;
  } catch {
    reason = undefined;
  }

  try {
    const invoice = await rejectContractorInvoice(userId, id, reason);
    return NextResponse.json({ ok: true, invoice });
  } catch (err) {
    console.error(`DELETE /api/admin/payouts/${id} failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
