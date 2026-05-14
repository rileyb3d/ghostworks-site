import { NextResponse } from "next/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  deleteAccount,
  getAccount,
  patchPublicMeta,
} from "@/lib/users";
import type { AccountPublicMeta, ContractorProfile } from "@/lib/users";

// Admin-only: edit (business name, contractor flag, contractor profile)
// or delete a user account. Stripe customer / Connect account records are
// intentionally retained on delete so payment history stays resolvable.

type PatchBody = {
  businessName?: string | null;
  isContractor?: boolean;
  contractor?: ContractorProfile | null;
};

const COUNTRY_RE = /^[A-Za-z]{2}$/;
const NAME_MAX = 120;
const ROLE_MAX = 80;

export async function PATCH(
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Partial<AccountPublicMeta> = {};

  if (body.businessName !== undefined) {
    if (body.businessName === null || body.businessName === "") {
      patch.businessName = undefined;
    } else if (typeof body.businessName !== "string") {
      return NextResponse.json(
        { error: "businessName must be a string." },
        { status: 400 },
      );
    } else {
      const trimmed = body.businessName.trim().slice(0, NAME_MAX);
      patch.businessName = trimmed || undefined;
    }
  }

  if (body.isContractor !== undefined) {
    patch.isContractor = !!body.isContractor;
  }

  if (body.contractor !== undefined) {
    if (body.contractor === null) {
      patch.contractor = undefined;
    } else {
      const role = typeof body.contractor.role === "string"
        ? body.contractor.role.trim().slice(0, ROLE_MAX)
        : undefined;
      const country = typeof body.contractor.country === "string"
        ? body.contractor.country.trim().toUpperCase()
        : undefined;
      if (country && !COUNTRY_RE.test(country)) {
        return NextResponse.json(
          { error: "Country must be a 2-letter ISO code (e.g. US)." },
          { status: 400 },
        );
      }
      const profile: ContractorProfile = {};
      if (role) profile.role = role;
      if (country) profile.country = country;
      patch.contractor = Object.keys(profile).length ? profile : undefined;
    }
  }

  try {
    await patchPublicMeta(id, patch);
    const updated = await getAccount(id);
    return NextResponse.json({ ok: true, account: updated });
  } catch (err) {
    console.error(`PATCH /api/admin/users/${id} failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "User id required." }, { status: 400 });
  }
  try {
    await deleteAccount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`DELETE /api/admin/users/${id} failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
