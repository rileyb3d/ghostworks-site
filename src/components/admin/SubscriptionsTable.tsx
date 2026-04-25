import type Stripe from "stripe";

type Props = {
  subscriptions: Stripe.Subscription[];
};

const STATUS_TONE: Record<Stripe.Subscription.Status, string> = {
  active: "bg-emerald-400/15 text-emerald-300",
  trialing: "bg-emerald-400/15 text-emerald-300",
  past_due: "bg-amber-400/15 text-amber-300",
  unpaid: "bg-red-400/15 text-red-300",
  canceled: "bg-zinc-700/30 text-zinc-400",
  incomplete: "bg-amber-400/15 text-amber-300",
  incomplete_expired: "bg-zinc-700/30 text-zinc-400",
  paused: "bg-zinc-700/30 text-zinc-400",
};

const STATUS_LABEL: Record<Stripe.Subscription.Status, string> = {
  active: "Active",
  trialing: "Trialing",
  past_due: "Past due",
  unpaid: "Unpaid",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  paused: "Paused",
};

const INTERVAL_LABEL: Record<string, string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

export function SubscriptionsTable({ subscriptions }: Props) {
  if (subscriptions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No active subscriptions. Start one above and it&apos;ll appear here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left font-display text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            <th className="py-3 pr-4 font-medium">Customer</th>
            <th className="py-3 pr-4 font-medium">Description</th>
            <th className="py-3 pr-4 font-medium">Cycle</th>
            <th className="py-3 pr-4 font-medium">Status</th>
            <th className="py-3 pr-4 text-right font-medium">Amount</th>
            <th className="py-3 text-right font-medium">Next billing</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.map((sub) => {
            const item = sub.items.data[0];
            const price = item?.price;
            const tone = STATUS_TONE[sub.status] ?? "bg-zinc-700/30 text-zinc-300";
            const label = STATUS_LABEL[sub.status] ?? sub.status;
            const description =
              typeof price?.product === "object" &&
              price.product &&
              "name" in price.product
                ? (price.product as Stripe.Product).name
                : (item?.metadata?.description ?? "—");
            const customerEmail =
              typeof sub.customer === "object" && sub.customer && !sub.customer.deleted
                ? sub.customer.email ?? "—"
                : "—";
            const cycle = price ? formatCycle(price) : "—";
            const periodEnd = item?.current_period_end ?? null;
            const nextBilling = sub.cancel_at_period_end
              ? `Cancels ${periodEnd ? formatDate(periodEnd) : "—"}`
              : periodEnd
                ? formatDate(periodEnd)
                : "—";

            return (
              <tr
                key={sub.id}
                className="border-b border-white/[0.04] align-top text-zinc-300"
              >
                <td className="py-4 pr-4 text-zinc-200">{customerEmail}</td>
                <td className="py-4 pr-4 text-zinc-200">{description}</td>
                <td className="py-4 pr-4 text-zinc-400">{cycle}</td>
                <td className="py-4 pr-4">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}
                  >
                    {label}
                  </span>
                </td>
                <td className="py-4 pr-4 text-right text-zinc-100 tabular-nums">
                  {price ? formatPriceAmount(price) : "—"}
                </td>
                <td className="py-4 text-right text-xs text-zinc-400">
                  {nextBilling}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatPriceAmount(price: Stripe.Price): string {
  if (price.unit_amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
  }).format(price.unit_amount / 100);
}

function formatCycle(price: Stripe.Price): string {
  if (price.type !== "recurring" || !price.recurring) return "—";
  const interval =
    INTERVAL_LABEL[price.recurring.interval] ?? price.recurring.interval;
  const count = price.recurring.interval_count;
  return count > 1 ? `every ${count} ${interval}s` : `every ${interval}`;
}

function formatDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(unixSeconds * 1000));
}
