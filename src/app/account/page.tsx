import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getOrCreateStripeCustomerId } from "@/lib/stripe-customer";
import { InvoicesList } from "@/components/account/InvoicesList";
import { SubscriptionsList } from "@/components/account/SubscriptionsList";
import { ManageBillingButton } from "@/components/account/ManageBillingButton";

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
      expand: ["data.items.data.price.product"],
    }),
  ]);
  return {
    invoices: invoices.data,
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
    billingError =
      "We couldn't reach Stripe right now. Refresh in a minute or contact support if it keeps happening.";
  }

  return (
    <div className="mx-auto max-w-4xl px-8 pt-32 pb-24 lg:px-16">
      <header className="flex flex-col gap-6 border-b border-white/[0.06] pb-10 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
            Client account
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Hi, {displayName}.
          </h1>
          {email ? (
            <p className="mt-2 text-sm text-zinc-500">{email}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <ManageBillingButton />
          <UserButton />
        </div>
      </header>

      {billingError ? (
        <p className="mt-10 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-3 text-sm text-red-300">
          {billingError}
        </p>
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
