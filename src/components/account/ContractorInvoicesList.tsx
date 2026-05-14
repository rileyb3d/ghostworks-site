import type { ContractorInvoice } from "@/lib/users";

type Props = {
  invoices: ContractorInvoice[];
};

export function ContractorInvoicesList({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No invoices submitted yet. Submit one above to get paid.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left font-display text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            <th className="py-3 pr-4 font-medium">Date</th>
            <th className="py-3 pr-4 font-medium">Description</th>
            <th className="py-3 pr-4 font-medium">Hours</th>
            <th className="py-3 pr-4 text-right font-medium">Amount</th>
            <th className="py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {[...invoices]
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((inv) => (
              <tr
                key={inv.id}
                className="border-b border-white/[0.04] align-top text-zinc-300"
              >
                <td className="py-4 pr-4 text-xs text-zinc-500">
                  {formatDate(inv.createdAt)}
                </td>
                <td className="py-4 pr-4 text-zinc-200">{inv.description}</td>
                <td className="py-4 pr-4 text-xs tabular-nums text-zinc-400">
                  {inv.hours ?? "—"}
                </td>
                <td className="py-4 pr-4 text-right text-zinc-100 tabular-nums">
                  {formatMoney(inv.amount, inv.currency)}
                </td>
                <td className="py-4">
                  <StatusBadge status={inv.status} />
                  {inv.rejectionReason ? (
                    <p className="mt-1 text-[11px] text-zinc-500">
                      {inv.rejectionReason}
                    </p>
                  ) : null}
                  {inv.paidAt ? (
                    <p className="mt-1 text-[11px] text-zinc-600">
                      Paid {formatDate(inv.paidAt)}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ContractorInvoice["status"] }) {
  const tone: Record<ContractorInvoice["status"], string> = {
    submitted: "bg-amber-400/15 text-amber-300",
    approved: "bg-sky-400/15 text-sky-300",
    paid: "bg-emerald-400/15 text-emerald-300",
    rejected: "bg-zinc-700/30 text-zinc-400",
  };
  const label: Record<ContractorInvoice["status"], string> = {
    submitted: "Submitted",
    approved: "Approved",
    paid: "Paid",
    rejected: "Rejected",
  };
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${tone[status]}`}
    >
      {label[status]}
    </span>
  );
}

function formatMoney(minor: number, currency: string): string {
  const divisor = currency === "jpy" ? 1 : 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(minor / divisor);
  } catch {
    return `${(minor / divisor).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}
