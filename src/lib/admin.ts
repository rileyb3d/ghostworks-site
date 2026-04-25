import { auth, currentUser } from "@clerk/nextjs/server";

// Admin gate based on a comma-separated allowlist in ADMIN_EMAILS. Kept in
// env so we can rotate without a code change. Server-only — never expose
// the admin list to the client.
function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress;
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

export async function requireAdmin(): Promise<void> {
  if (!(await isCurrentUserAdmin())) {
    throw new Response("Forbidden", { status: 403 });
  }
}
