import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getOrCreateStripeCustomerId } from "@/lib/stripe-customer";
import { getConnectStatus } from "@/lib/contractor";
import {
  readPrivateMeta,
  readPublicMeta,
} from "@/lib/users";
import type { ContractorInvoice } from "@/lib/users";
import { InvoicesList } from "@/components/account/InvoicesList";
import { SubscriptionsList } from "@/components/account/SubscriptionsList";
import { ManageBillingButton } from "@/components/account/ManageBillingButton";
import { ContractorOnboarding } from "@/components/account/ContractorOnboarding";
import { ContractorInvoiceForm } from "@/components/account/ContractorInvoiceForm";
import { ContractorInvoicesList } from "@/components/account/ContractorInvoicesList";

export const metadata = {
  title: "Account — Ghostworks",
};

// Server-side render: pull invoices + subscriptions on the server so the
// page is fully populated on first paint and we never expose Stripe data
// through a public client API.
async function loadBilling(customerId: string): Promise<{
  invoices: Stripe.Invoice[];
  subscriptions: Stripe.Subscription[];
}> {
  const stripe = getStripe();
  const [invoices, subscriptions] = await Promise.all([
    stripe.invoices.list({ customer: customerId, limit: 20 }),
    stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
      // Stripe caps expand at 4 levels. Price is included by default; the
      // product name falls back to a generic label in SubscriptionsList.
      expand: ["data.items.data.price"],
    }),
  ]);
  return {
    // Skip invoices admins archived. Stripe still has them on file, but we
    // don't show them to the customer.
    invoices: invoices.data.filter((inv) => inv.metadata?.archived !== "true"),
    subscriptions: subscriptions.data,
  };
}

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/account");
  }

  const user = await currentUser();
  const displayName = user?.firstName || user?.username || "there";
  const email = user?.primaryEmailAddress?.emailAddress;

  // Pull the same Clerk user via the server client so we can read both
  // public and private metadata. `currentUser()` is enough for display
  // fields but doesn't carry private metadata.
  const client = await clerkClient();
  const fullUser = await client.users.getUser(userId);
  const pub = readPublicMeta(fullUser);
  const priv = readPrivateMeta(fullUser);
  const isContractor = !!pub.isContractor;
  const businessName = pub.businessName ?? null;

  let invoices: Stripe.Invoice[] = [];
  let subscriptions: Stripe.Subscription[] = [];
  let billingError: string | null = null;

  try {
    const customerId = await getOrCreateStripeCustomerId(userId);
    const data = await loadBilling(customerId);
    invoices = data.invoices;
    subscriptions = data.subscriptions;
  } catch (err) {
    console.error("Failed to load billing data", err);
    const detail =
      err instanceof Error ? err.message : typeof err === "string" ? err : "Unknown error";
    billingError = `Stripe error: ${detail}`;
  }

  let connectStatus: Awaited<ReturnType<typeof getConnectStatus>> = null;
  let connectError: string | null = null;
  if (isContractor && priv.stripeConnectAccountId) {
    try {
      connectStatus = await getConnectStatus(userId);
    } catch (err) {
      console.error("Failed to load Connect status", err);
      connectError =
        err instanceof Error ? err.message : "Could not load payout status.";
    }
  }

  const contractorInvoices: ContractorInvoice[] = priv.contractorInvoices ?? [];
  const payoutsReady = !!connectStatus?.payoutsEnabled;

  return (
    <div className="mx-auto max-w-4xl px-8 pt-32 pb-24 lg:px-16">
      <header className="flex flex-col gap-6 border-b border-white/[0.06] pb-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
            {isContractor ? "Contractor account" : "Client account"}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Hi, {displayName}.
          </h1>
          {businessName ? (
            <p className="mt-2 text-sm text-zinc-300">{businessName}</p>
          ) : null}
          {email ? (
            <p className="mt-1 text-sm text-zinc-500">{email}</p>
          ) : null}
          {isContractor && pub.contractor?.role ? (
            <p className="mt-1 text-sm text-zinc-500">
              {pub.contractor.role}
              {pub.contractor.country ? ` · ${pub.contractor.country}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <ManageBillingButton />
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Link
                label="Billing"
                labelIcon={<BillingIcon />}
                href="/account"
              />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </header>

      {billingError ? (
        <p className="mt-10 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
          {billingError}
        </p>
      ) : null}

      {isContractor ? (
        <>
          <Section
            label="Payout setup"
            hint="Complete Stripe onboarding once. We pay approved invoices straight to your bank."
          >
            {connectError ? (
              <p className="rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
                {connectError}
              </p>
            ) : (
              <ContractorOnboarding status={connectStatus} />
            )}
          </Section>

          <Section
            label="Submit an invoice"
            hint="Send a timesheet or fixed-fee invoice to the studio. An admin will review and approve before payment."
          >
            <ContractorInvoiceForm
              disabled={!payoutsReady}
              disabledHint={
                payoutsReady
                  ? null
                  : "Finish Stripe payout setup above before submitting invoices."
              }
            />
          </Section>

          <Section
            label="Your submissions"
            hint="Most recent first. Status updates when an admin reviews or pays."
          >
            <ContractorInvoicesList invoices={contractorInvoices} />
          </Section>
        </>
      ) : null}

      <Section
        label="Project invoices"
        hint="Issued invoices for completed work and milestones."
      >
        <InvoicesList invoices={invoices} />
      </Section>

      <Section
        label="Recurring payments"
        hint="Retainers and ongoing subscriptions."
      >
        <SubscriptionsList subscriptions={subscriptions} />
      </Section>
    </div>
  );
}

function BillingIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

function Section({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-14">
      <div className="flex items-end justify-between border-b border-white/[0.06] pb-4">
        <div>
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
            {label}
          </h2>
          <p className="mt-2 text-sm text-zinc-400">{hint}</p>
        </div>
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}
