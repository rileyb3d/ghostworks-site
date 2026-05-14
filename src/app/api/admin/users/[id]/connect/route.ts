import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  createOnboardingLink,
  getConnectStatus,
  getOrCreateConnectAccountId,
} from "@/lib/contractor";

// Admin: ensure a Stripe Connect Express account exists for the
// contractor and (optionally) return an onboarding link the admin can
// hand-deliver. Status is included so the UI can reflect it.

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "User id required." }, { status: 400 });
  }

  const url = new URL(req.url);
  const withLink = url.searchParams.get("link") === "1";

  try {
    const accountId = await getOrCreateConnectAccountId(id);
    const status = await getConnectStatus(id);
    const onboardingUrl = withLink ? await createOnboardingLink(id) : undefined;
    return NextResponse.json({
      ok: true,
      accountId,
      status,
      onboardingUrl,
    });
  } catch (err) {
    console.error(`POST /api/admin/users/${id}/connect failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
