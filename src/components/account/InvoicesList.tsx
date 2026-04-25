import type Stripe from "stripe";

type Props = {
  invoices: Stripe.Invoice[];
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  open: "Awaiting payment",
  paid: "Paid",
  uncollectible: "Uncollectible",
  void: "Void",
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-zinc-700/20 text-zinc-300",
  open: "bg-amber-400/15 text-amber-300",
  paid: "bg-emerald-400/15 text-emerald-300",
  uncollectible: "bg-red-400/15 text-red-300",
  void: "bg-zinc-700/20 text-zinc-400",
};

export function InvoicesList({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No invoices yet. When we send you one it&apos;ll appear here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-white/[0.06]">
      {invoices.map((inv) => (
        <li
          key={inv.id}
          className="flex flex-col gap-3 py-5 md:flex-row md:items-center md:justify-between"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-medium text-white">
                {inv.number ?? inv.id?.slice(-8).toUpperCase()}
              </span>
              <StatusPill status={inv.status ?? "draft"} />
            </div>
            <p className="mt-1 truncate text-sm text-zinc-500">
              {inv.description ??
                inv.lines.data[0]?.description ??
                "Project invoice"}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {formatDate(inv.created)}
              {inv.due_date ? ` · due ${formatDate(inv.due_date)}` : null}
            </p>
          </div>
          <div className="flex items-center gap-6 md:justify-end">
            <span className="font-display text-base tabular-nums text-white">
              {formatMoney(inv.amount_due, inv.currency)}
            </span>
            {inv.hosted_invoice_url ? (
              <a
                href={inv.hosted_invoice_url}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="pointer"
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black"
              >
                {inv.status === "paid" ? "Receipt" : "Pay"}
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? "bg-zinc-700/20 text-zinc-300";
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}
    >
      {label}
    </span>
  );
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(unixSeconds: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(unixSeconds * 1000));
}
