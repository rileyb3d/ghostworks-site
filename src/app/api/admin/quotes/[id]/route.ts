import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { deleteQuote } from "@/lib/quotes";

// Admin-only: delete a quote (removes both the JSON record and the PDF
// blob). There's no patch endpoint yet — quotes are write-once for now;
// re-issue a new one if pricing or scope changes.
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Quote id required." }, { status: 400 });
  }
  try {
    await deleteQuote(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/admin/quotes/${id} failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
