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

  // Hide invoices admins have archived. Stripe still keeps them on record;
  // we just don't surface them in the dashboard or in customer /account.
  const visibleInvoices = stripeData.invoices.filter(
    (inv) => inv.metadata?.archived !== "true",
  );

  const stats = computeStats(visibleInvoices, stripeData.subscriptions);

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

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Accounts receivable"
          value={formatMoney(stats.accountsReceivable)}
          hint={`${stats.openCount} open invoice${stats.openCount === 1 ? "" : "s"}`}
          tone="amber"
        />
        <StatCard
          label="Past due"
          value={formatMoney(stats.pastDue)}
          hint={`${stats.pastDueCount} overdue`}
          tone={stats.pastDue > 0 ? "red" : "muted"}
        />
        <StatCard
          label="Paid (lifetime)"
          value={formatMoney(stats.paidLifetime)}
          hint={`${stats.paidCount} invoice${stats.paidCount === 1 ? "" : "s"}`}
          tone="emerald"
        />
        <StatCard
          label="MRR"
          value={formatMoney(stats.mrr)}
          hint={`${stats.activeSubsCount} active subscription${stats.activeSubsCount === 1 ? "" : "s"}`}
          tone="muted"
        />
      </div>

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
        hint="Most recent first. Click Open to view the hosted invoice. Archive a paid invoice to hide it from this list."
      >
        <InvoicesTable invoices={visibleInvoices} />
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

const TONE_BORDER: Record<"amber" | "red" | "emerald" | "muted", string> = {
  amber: "border-amber-400/30",
  red: "border-red-400/40",
  emerald: "border-emerald-400/30",
  muted: "border-white/[0.08]",
};

const TONE_VALUE: Record<"amber" | "red" | "emerald" | "muted", string> = {
  amber: "text-amber-200",
  red: "text-red-200",
  emerald: "text-emerald-200",
  muted: "text-white",
};

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "amber" | "red" | "emerald" | "muted";
}) {
  return (
    <div
      className={`rounded-md border bg-white/[0.02] px-5 py-4 ${TONE_BORDER[tone]}`}
    >
      <p className="font-display text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-2xl font-semibold tabular-nums ${TONE_VALUE[tone]}`}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

// Aggregate stats off the already-fetched lists, so we don't pay extra Stripe
// API calls. Numbers reflect *all currencies normalized to USD numerically* —
// since this codebase only issues USD billing, this is fine. If we ever bill
// in EUR/GBP, switch to per-currency buckets.
function computeStats(
  invoices: Stripe.Invoice[],
  subscriptions: Stripe.Subscription[],
): {
  accountsReceivable: number;
  openCount: number;
  pastDue: number;
  pastDueCount: number;
  paidLifetime: number;
  paidCount: number;
  mrr: number;
  activeSubsCount: number;
} {
  let accountsReceivable = 0;
  let openCount = 0;
  let pastDue = 0;
  let pastDueCount = 0;
  let paidLifetime = 0;
  let paidCount = 0;

  const now = Math.floor(Date.now() / 1000);

  for (const inv of invoices) {
    if (inv.status === "open" || inv.status === "uncollectible") {
      accountsReceivable += inv.amount_remaining ?? inv.total ?? 0;
      openCount += 1;
      if (inv.due_date && inv.due_date < now) {
        pastDue += inv.amount_remaining ?? inv.total ?? 0;
        pastDueCount += 1;
      }
    } else if (inv.status === "paid") {
      paidLifetime += inv.amount_paid ?? inv.total ?? 0;
      paidCount += 1;
    }
  }

  let mrr = 0;
  let activeSubsCount = 0;
  for (const sub of subscriptions) {
    if (sub.status !== "active" && sub.status !== "trialing") continue;
    activeSubsCount += 1;
    for (const item of sub.items.data) {
      const price = item.price;
      if (!price.recurring || price.unit_amount == null) continue;
      const qty = item.quantity ?? 1;
      const cycle = price.recurring;
      const monthly = toMonthlyCents(
        price.unit_amount * qty,
        cycle.interval,
        cycle.interval_count,
      );
      mrr += monthly;
    }
  }

  return {
    accountsReceivable,
    openCount,
    pastDue,
    pastDueCount,
    paidLifetime,
    paidCount,
    mrr: Math.round(mrr),
    activeSubsCount,
  };
}

function toMonthlyCents(
  perCycle: number,
  interval: "day" | "week" | "month" | "year",
  intervalCount: number,
): number {
  switch (interval) {
    case "day":
      return (perCycle * 30) / intervalCount;
    case "week":
      return (perCycle * (52 / 12)) / intervalCount;
    case "month":
      return perCycle / intervalCount;
    case "year":
      return perCycle / (12 * intervalCount);
  }
}
