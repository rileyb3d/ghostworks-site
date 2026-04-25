import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { InvoiceForm } from "@/components/admin/InvoiceForm";

export const metadata = {
  title: "New invoice — Ghostworks admin",
};

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
    console.error("Failed to load Clerk user list for admin form", err);
    return [];
  }
}

export default async function AdminInvoicesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/invoices");
  }
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }

  const knownEmails = await loadKnownEmails();

  return (
    <div className="mx-auto max-w-3xl px-8 pt-32 pb-24 lg:px-16">
      <header className="border-b border-white/[0.06] pb-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
          Admin
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Issue billing
        </h1>
        <p className="mt-3 text-sm text-zinc-300">
          Create a one-off invoice or start a recurring payment. Both create a
          Stripe customer if one doesn&apos;t exist and email a hosted payment
          link to the customer.
        </p>
      </header>
      <div className="mt-12">
        <InvoiceForm knownEmails={knownEmails} />
      </div>
    </div>
  );
}
