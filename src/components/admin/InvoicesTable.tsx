"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type Stripe from "stripe";

type Props = {
  invoices: Stripe.Invoice[];
};

const STATUS_TONE: Record<NonNullable<Stripe.Invoice.Status>, string> = {
  draft: "bg-zinc-700/30 text-zinc-300",
  open: "bg-amber-400/15 text-amber-300",
  paid: "bg-emerald-400/15 text-emerald-300",
  uncollectible: "bg-red-400/15 text-red-300",
  void: "bg-zinc-700/30 text-zinc-400",
};

const STATUS_LABEL: Record<NonNullable<Stripe.Invoice.Status>, string> = {
  draft: "Draft",
  open: "Pending",
  paid: "Paid",
  uncollectible: "Uncollectible",
  void: "Void",
};

export function InvoicesTable({ invoices }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(invoice: Stripe.Invoice) {
    if (!invoice.id) return;
    const verb =
      invoice.status === "draft"
        ? "delete this draft invoice"
        : "void this invoice (cannot be undone)";
    if (!window.confirm(`Are you sure you want to ${verb}?`)) return;

    setError(null);
    setBusyId(invoice.id);
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        action?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not remove invoice.");
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (invoices.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No invoices yet. Issue one above and it&apos;ll appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.08] text-left font-display text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
              <th className="py-3 pr-4 font-medium">Date</th>
              <th className="py-3 pr-4 font-medium">Customer</th>
              <th className="py-3 pr-4 font-medium">Description</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 pr-4 text-right font-medium">Amount</th>
              <th className="py-3 pr-4 text-right font-medium">Due</th>
              <th className="py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const status = inv.status ?? "draft";
              const tone =
                STATUS_TONE[status] ?? "bg-zinc-700/30 text-zinc-300";
              const label = STATUS_LABEL[status] ?? status;
              const description =
                inv.lines.data[0]?.description ?? inv.description ?? "—";
              const customerEmail =
                inv.customer_email ??
                (typeof inv.customer === "object" &&
                inv.customer &&
                !inv.customer.deleted
                  ? inv.customer.email ?? "—"
                  : "—");
              const amount = formatMoney(inv.total, inv.currency);
              const due = inv.due_date ? formatDate(inv.due_date) : "—";
              const created = formatDate(inv.created);
              const canRemove =
                status === "draft" ||
                status === "open" ||
                status === "uncollectible";
              const removeLabel = status === "draft" ? "Delete" : "Void";
              const isBusy = busyId === inv.id || pending;

              return (
                <tr
                  key={inv.id}
                  className="border-b border-white/[0.04] align-top text-zinc-300"
                >
                  <td className="py-4 pr-4 text-xs text-zinc-500">{created}</td>
                  <td className="py-4 pr-4">
                    <div className="text-zinc-200">{customerEmail}</div>
                    {inv.number ? (
                      <div className="mt-0.5 text-[11px] text-zinc-600">
                        {inv.number}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4 text-zinc-200">{description}</td>
                  <td className="py-4 pr-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${tone}`}
                    >
                      {label}
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-right text-zinc-100 tabular-nums">
                    {amount}
                  </td>
                  <td className="py-4 pr-4 text-right text-xs text-zinc-500">
                    {due}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      {inv.hosted_invoice_url ? (
                        <a
                          href={inv.hosted_invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-300 underline underline-offset-2 hover:text-white"
                        >
                          Open
                        </a>
                      ) : null}
                      {inv.invoice_pdf ? (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-300 underline underline-offset-2 hover:text-white"
                        >
                          PDF
                        </a>
                      ) : null}
                      {canRemove ? (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => onDelete(inv)}
                          className="rounded-md border border-red-400/30 px-2 py-1 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                        >
                          {isBusy && busyId === inv.id
                            ? "Working…"
                            : removeLabel}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
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
