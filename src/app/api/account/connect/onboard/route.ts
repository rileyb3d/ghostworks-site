import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createOnboardingLink } from "@/lib/contractor";
import { readPublicMeta } from "@/lib/users";

// Contractor-facing: kick off (or resume) Stripe Connect Express
// onboarding. Server creates the Connect account lazily if needed and
// returns a single-use hosted onboarding URL.

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const pub = readPublicMeta(user);
  if (!pub.isContractor) {
    return NextResponse.json(
      { error: "This account is not flagged as a contractor." },
      { status: 403 },
    );
  }

  try {
    const url = await createOnboardingLink(userId);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error(`POST /api/account/connect/onboard failed`, err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
