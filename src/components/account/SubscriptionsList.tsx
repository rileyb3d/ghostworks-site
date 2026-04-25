import type Stripe from "stripe";

type Props = {
  subscriptions: Stripe.Subscription[];
};

const STATUS_LABEL: Record<Stripe.Subscription.Status, string> = {
  active: "Active",
  past_due: "Past due",
  unpaid: "Unpaid",
  canceled: "Canceled",
  incomplete: "Incomplete",
  incomplete_expired: "Expired",
  trialing: "Trialing",
  paused: "Paused",
};

const STATUS_TONE: Record<Stripe.Subscription.Status, string> = {
  active: "bg-emerald-400/15 text-emerald-300",
  trialing: "bg-emerald-400/15 text-emerald-300",
  past_due: "bg-amber-400/15 text-amber-300",
  unpaid: "bg-red-400/15 text-red-300",
  canceled: "bg-zinc-700/20 text-zinc-400",
  incomplete: "bg-amber-400/15 text-amber-300",
  incomplete_expired: "bg-zinc-700/20 text-zinc-400",
  paused: "bg-zinc-700/20 text-zinc-400",
};

const INTERVAL_LABEL: Record<string, string> = {
  day: "day",
  week: "week",
  month: "month",
  year: "year",
};

export function SubscriptionsList({ subscriptions }: Props) {
  if (subscriptions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No recurring payments. Retainers and recurring services will appear
        here when active.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06]">
      {subscriptions.map((sub) => {
        const item = sub.items.data[0];
        const price = item?.price;
        const product =
          typeof item?.price.product === "object" && item.price.product && "name" in item.price.product
            ? (item.price.product as Stripe.Product).name
            : "Recurring service";
        const tone = STATUS_TONE[sub.status] ?? "bg-zinc-700/20 text-zinc-300";
        const label = STATUS_LABEL[sub.status] ?? sub.status;
        const periodEnd = item?.current_period_end;

        return (
          <li
            key={sub.id}
            className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-medium text-white">
                  {product}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}
                >
                  {label}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-600">
                {sub.cancel_at_period_end
                  ? `Cancels on ${periodEnd ? formatDate(periodEnd) : "renewal"}`
                  : periodEnd
                    ? `Renews ${formatDate(periodEnd)}`
                    : null}
              </p>
            </div>
            <div className="flex items-center gap-6 md:justify-end">
              <span className="font-display text-base tabular-nums text-white">
                {price ? formatPrice(price) : "—"}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatPrice(price: Stripe.Price): string {
  if (price.unit_amount == null) return "—";
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: price.currency.toUpperCase(),
  }).format(price.unit_amount / 100);
  if (price.type !== "recurring" || !price.recurring) return amount;
  const interval = INTERVAL_LABEL[price.recurring.interval] ?? price.recurring.interval;
  const count = price.recurring.interval_count;
  return count > 1 ? `${amount} / ${count} ${interval}s` : `${amount} / ${interval}`;
}

function formatDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(unixSeconds * 1000));
}
