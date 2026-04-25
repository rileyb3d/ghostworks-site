import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type Stripe from "stripe";
import { isCurrentUserAdmin } from "@/lib/admin";
import { getStripe } from "@/lib/stripe";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { InvoicesTable } from "@/components/admin/InvoicesTable";
import { SubscriptionsTable } from "@/components/admin/SubscriptionsTable";

export const metadata = {
  title: "Billing — Ghostworks admin",
};

// Always render fresh — admin needs to see the latest billing state, not a
// stale ISR snapshot.
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
    console.error("Failed to load Clerk user list for admin form", err);
    return [];
  }
}

async function loadStripeData(): Promise<{
  invoices: Stripe.Invoice[];
  subscriptions: Stripe.Subscription[];
  error?: string;
}> {
  try {
    const stripe = getStripe();
    const [invoiceRes, subRes] = await Promise.all([
      stripe.invoices.list({ limit: 100, expand: ["data.customer"] }),
      stripe.subscriptions.list({
        status: "all",
        limit: 100,
        // 4-level expand cap: data > items > data > price (product expansion
        // would be the 5th level). Product name is read off price_data via the
        // product field if available, falls back to "—" otherwise.
        expand: ["data.customer", "data.items.data.price"],
      }),
    ]);
    return {
      invoices: invoiceRes.data,
      subscriptions: subRes.data,
    };
  } catch (err) {
    console.error("Failed to load admin Stripe data", err);
    const detail = err instanceof Error ? err.message : "Unknown error";
    return {
      invoices: [],
      subscriptions: [],
      error: `Stripe error: ${detail}`,
    };
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

  const [knownEmails, stripeData] = await Promise.all([
    loadKnownEmails(),
    loadStripeData(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-8 pt-32 pb-24 lg:px-16">
      <header className="border-b border-white/[0.06] pb-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
          Admin
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Billing
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">
          Issue one-off invoices or start recurring payments. Both create the
          Stripe customer if needed and email a hosted payment link.
        </p>
      </header>

      <Section label="New billing">
        <InvoiceForm knownEmails={knownEmails} />
      </Section>

      {stripeData.error ? (
        <p className="mt-10 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
          {stripeData.error}
        </p>
      ) : null}

      <Section
        label="All invoices"
        hint="Most recent first. Click Open to view the hosted invoice."
      >
        <InvoicesTable invoices={stripeData.invoices} />
      </Section>

      <Section
        label="Recurring payments"
        hint="Active and past subscriptions. Next billing is when Stripe will auto-charge the customer's saved card."
      >
        <SubscriptionsTable subscriptions={stripeData.subscriptions} />
      </Section>
    </div>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="border-b border-white/[0.06] pb-4">
        <h2 className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
          {label}
        </h2>
        {hint ? <p className="mt-2 text-sm text-zinc-500">{hint}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
