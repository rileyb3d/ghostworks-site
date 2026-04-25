import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { isCurrentUserAdmin } from "@/lib/admin";

// Admin-only: remove an invoice. Stripe rules:
//   - draft         -> permanently deletable via API
//   - open / uncollectible -> can only be voided (kept on record, cancelled)
//   - paid          -> Stripe forbids delete/void; we mark metadata.archived
//                      and filter those out of every list. The actual Stripe
//                      record stays for accounting, refunds happen via the
//                      Stripe dashboard if needed.
//   - void          -> already gone, noop
//
// We pick the right action based on current status and return what we did
// so the UI can reflect it.

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Invoice id required." }, { status: 400 });
  }

  try {
    const stripe = getStripe();
    const invoice = await stripe.invoices.retrieve(id);

    switch (invoice.status) {
      case "draft": {
        await stripe.invoices.del(id);
        return NextResponse.json({ ok: true, action: "deleted" });
      }
      case "open":
      case "uncollectible": {
        const voided = await stripe.invoices.voidInvoice(id);
        return NextResponse.json({
          ok: true,
          action: "voided",
          status: voided.status,
        });
      }
      case "void":
        return NextResponse.json(
          { error: "Invoice is already void." },
          { status: 400 },
        );
      case "paid": {
        const updated = await stripe.invoices.update(id, {
          metadata: {
            ...(invoice.metadata ?? {}),
            archived: "true",
            archivedAt: new Date().toISOString(),
          },
        });
        return NextResponse.json({
          ok: true,
          action: "archived",
          status: updated.status,
        });
      }
      default:
        return NextResponse.json(
          { error: `Unsupported invoice status: ${invoice.status ?? "unknown"}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("Admin invoice delete failed", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Stripe error: ${detail}` }, { status: 502 });
  }
}
