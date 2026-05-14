import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { listQuotes } from "@/lib/quotes";
import { AdminNav } from "@/components/admin/AdminNav";
import { QuoteForm } from "@/components/admin/QuoteForm";
import { QuotesTable } from "@/components/admin/QuotesTable";

export const metadata = {
  title: "Quotes — Ghostworks admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function loadKnownEmails(): Promise<string[]> {
  try {
    const client = await clerkClient();
    const list = await client.users.getUserList({ limit: 500 });
    const emails = new Set<string>();
    for (const u of list.data) {
      const primary = u.primaryEmailAddressId
        ? u.emailAddresses.find((e) => e.id === u.primaryEmailAddressId)
        : undefined;
      const addr = primary?.emailAddress ?? u.emailAddresses[0]?.emailAddress;
      if (addr) emails.add(addr);
    }
    return Array.from(emails).sort();
  } catch (err) {
    console.error("Failed to load Clerk user list for quote form", err);
    return [];
  }
}

export default async function AdminQuotesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/quotes");
  }
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }

  const [knownEmails, quotes] = await Promise.all([
    loadKnownEmails(),
    listQuotes(200).catch((err) => {
      console.error("Failed to list quotes", err);
      return [];
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-8 pt-32 pb-24 lg:px-16">
      <AdminNav />
      <header className="border-b border-white/[0.06] pb-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
          Admin
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Quotes
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">
          Generate a PDF quote with project details, pricing, and standardized
          terms. Quotes are stored so you can re-download them later.
        </p>
      </header>

      <section className="mt-14">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
            New quote
          </h2>
        </div>
        <div className="mt-6">
          <QuoteForm knownEmails={knownEmails} />
        </div>
      </section>

      <section className="mt-14">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
            History
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Most recent first. PDFs live in Vercel Blob and stay reachable
            until you delete them.
          </p>
        </div>
        <div className="mt-6">
          <QuotesTable quotes={quotes} />
        </div>
      </section>
    </div>
  );
}
