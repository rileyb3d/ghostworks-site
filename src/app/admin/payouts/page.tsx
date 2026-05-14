import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  listContractors,
  readPrivateMeta,
  readPublicMeta,
} from "@/lib/users";
import { getStripe } from "@/lib/stripe";
import { AdminNav } from "@/components/admin/AdminNav";
import { PayoutsTable } from "@/components/admin/PayoutsTable";
import type { PayoutRow } from "@/components/admin/PayoutsTable";

export const metadata = {
  title: "Payouts — Ghostworks admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Build the cross-contractor list of invoices in all states, hydrating
// each with the contractor's Connect payout readiness. We batch the
// account fetches by uniquing the connect IDs in play.
async function buildRows(): Promise<{
  pending: PayoutRow[];
  history: PayoutRow[];
  error?: string;
}> {
  const contractors = await listContractors(500);
  if (contractors.length === 0) {
    return { pending: [], history: [] };
  }

  const client = await clerkClient();
  const stripe = getStripe();

  // We need full users (for privateMetadata) — listAccounts already hits
  // the API but only returns summaries. Pull the source users now.
  const users = await Promise.all(
    contractors.map((c) => client.users.getUser(c.id)),
  );

  // De-dupe connect account lookups for efficiency.
  const accountIds = Array.from(
    new Set(
      users
        .map((u) => readPrivateMeta(u).stripeConnectAccountId)
        .filter((id): id is string => !!id),
    ),
  );
  const payoutReady = new Map<string, boolean>();
  await Promise.all(
    accountIds.map(async (acctId) => {
      try {
        const acct = await stripe.accounts.retrieve(acctId);
        payoutReady.set(acctId, !!acct.payouts_enabled);
      } catch (err) {
        console.error(`Failed to retrieve Connect account ${acctId}`, err);
        payoutReady.set(acctId, false);
      }
    }),
  );

  const pending: PayoutRow[] = [];
  const history: PayoutRow[] = [];

  for (const user of users) {
    const pub = readPublicMeta(user);
    const priv = readPrivateMeta(user);
    const invoices = priv.contractorInvoices ?? [];
    if (invoices.length === 0) continue;

    const acctId = priv.stripeConnectAccountId;
    const userInfo: PayoutRow["user"] = {
      id: user.id,
      email:
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null,
      name:
        [user.firstName, user.lastName].filter(Boolean).join(" ") ||
        pub.businessName ||
        user.id,
      businessName: pub.businessName ?? null,
      role: pub.contractor?.role ?? null,
      country: pub.contractor?.country ?? null,
      payoutsEnabled: acctId ? payoutReady.get(acctId) ?? false : false,
    };

    for (const inv of invoices) {
      const row: PayoutRow = { invoice: inv, user: userInfo };
      if (inv.status === "submitted" || inv.status === "approved") {
        pending.push(row);
      } else {
        history.push(row);
      }
    }
  }

  pending.sort((a, b) => b.invoice.createdAt - a.invoice.createdAt);
  history.sort((a, b) => b.invoice.createdAt - a.invoice.createdAt);
  return { pending, history };
}

function totalPending(rows: PayoutRow[]): number {
  // Sum in major USD units for the headline stat. Mixed-currency totals
  // are messy — we just count USD invoices and label "USD" so the number
  // doesn't lie. Non-USD pending counts are shown next to the stat.
  return rows
    .filter((r) => r.invoice.currency === "usd")
    .reduce((sum, r) => sum + r.invoice.amount, 0);
}

function nonUsdCount(rows: PayoutRow[]): number {
  return rows.filter((r) => r.invoice.currency !== "usd").length;
}

export default async function AdminPayoutsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/payouts");
  }
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }

  const { pending, history } = await buildRows();

  const pendingUsdCents = totalPending(pending);
  const otherCurrency = nonUsdCount(pending);

  return (
    <div className="mx-auto max-w-6xl px-8 pt-32 pb-24 lg:px-16">
      <AdminNav />
      <header className="border-b border-white/[0.06] pb-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
          Admin
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Payouts
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">
          Contractor-submitted invoices. Approve to transfer immediately from
          your Stripe balance, or reject with a reason.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Pending (USD)"
          value={formatUsd(pendingUsdCents)}
          hint={`${pending.length} submitted${otherCurrency ? ` · ${otherCurrency} in other currency` : ""}`}
          tone="amber"
        />
        <Stat
          label="Paid history"
          value={history.filter((h) => h.invoice.status === "paid").length.toString()}
          hint="Transfers completed"
          tone="emerald"
        />
        <Stat
          label="Rejected"
          value={history
            .filter((h) => h.invoice.status === "rejected")
            .length.toString()}
          hint="Declined submissions"
          tone="muted"
        />
      </div>

      <section className="mt-14">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
            Pending
          </h2>
        </div>
        <div className="mt-6">
          <PayoutsTable
            rows={pending}
            empty="No pending submissions. Contractors will appear here when they submit."
            showActions
          />
        </div>
      </section>

      <section className="mt-14">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
            History
          </h2>
        </div>
        <div className="mt-6">
          <PayoutsTable
            rows={history}
            empty="No completed or rejected payouts yet."
            showActions={false}
          />
        </div>
      </section>
    </div>
  );
}

const TONE_BORDER: Record<"amber" | "emerald" | "muted", string> = {
  amber: "border-amber-400/30",
  emerald: "border-emerald-400/30",
  muted: "border-white/[0.08]",
};

const TONE_VALUE: Record<"amber" | "emerald" | "muted", string> = {
  amber: "text-amber-200",
  emerald: "text-emerald-200",
  muted: "text-white",
};

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "amber" | "emerald" | "muted";
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

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
