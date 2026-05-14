"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContractorInvoice } from "@/lib/users";

export type PayoutRow = {
  invoice: ContractorInvoice;
  user: {
    id: string;
    email: string | null;
    name: string;
    businessName: string | null;
    role: string | null;
    country: string | null;
    payoutsEnabled: boolean;
  };
};

type Props = {
  rows: PayoutRow[];
  empty: string;
  showActions: boolean;
};

export function PayoutsTable({ rows, empty, showActions }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function approveAndPay(row: PayoutRow) {
    if (!row.user.payoutsEnabled) {
      setError(
        `${row.user.name} hasn't finished Stripe onboarding — payouts are blocked.`,
      );
      return;
    }
    const formatted = formatMoney(row.invoice.amount, row.invoice.currency);
    if (
      !window.confirm(
        `Approve and pay ${formatted} to ${row.user.name}?\n\n` +
          `This transfers immediately from your Stripe balance.`,
      )
    ) {
      return;
    }
    setError(null);
    setBusyId(row.invoice.id);
    try {
      const res = await fetch(
        `/api/admin/payouts/${row.invoice.id}?userId=${encodeURIComponent(row.user.id)}`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Payout failed.");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(row: PayoutRow) {
    const reason = window.prompt(
      `Reject this submission from ${row.user.name}?\n\n` +
        `Optional reason (the contractor will see this in their /account):`,
    );
    if (reason === null) return;
    setError(null);
    setBusyId(row.invoice.id);
    try {
      const res = await fetch(
        `/api/admin/payouts/${row.invoice.id}?userId=${encodeURIComponent(row.user.id)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: reason || undefined }),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Reject failed.");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{empty}</p>;
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
              <th className="py-3 pr-4 font-medium">Submitted</th>
              <th className="py-3 pr-4 font-medium">Contractor</th>
              <th className="py-3 pr-4 font-medium">Description</th>
              <th className="py-3 pr-4 font-medium">Hours</th>
              <th className="py-3 pr-4 text-right font-medium">Amount</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              {showActions ? (
                <th className="py-3 text-right font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isBusy = busyId === row.invoice.id || pending;
              return (
                <tr
                  key={row.invoice.id}
                  className="border-b border-white/[0.04] align-top text-zinc-300"
                >
                  <td className="py-4 pr-4 text-xs text-zinc-500">
                    {formatDate(row.invoice.createdAt)}
                  </td>
                  <td className="py-4 pr-4">
                    <div className="text-zinc-100">{row.user.name}</div>
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {row.user.email ?? "—"}
                    </div>
                    {row.user.role ? (
                      <div className="mt-0.5 text-[11px] text-zinc-600">
                        {row.user.role}
                        {row.user.country ? ` · ${row.user.country}` : ""}
                      </div>
                    ) : null}
                  </td>
                  <td className="py-4 pr-4 text-zinc-200">
                    {row.invoice.description}
                  </td>
                  <td className="py-4 pr-4 text-xs tabular-nums text-zinc-400">
                    {row.invoice.hours ?? "—"}
                  </td>
                  <td className="py-4 pr-4 text-right text-zinc-100 tabular-nums">
                    {formatMoney(row.invoice.amount, row.invoice.currency)}
                  </td>
                  <td className="py-4 pr-4">
                    <StatusBadge invoice={row.invoice} />
                    {row.invoice.status === "submitted" && !row.user.payoutsEnabled ? (
                      <p className="mt-1 text-[10px] text-amber-300/80">
                        Onboarding incomplete
                      </p>
                    ) : null}
                    {row.invoice.rejectionReason ? (
                      <p className="mt-1 text-[10px] text-zinc-500">
                        {row.invoice.rejectionReason}
                      </p>
                    ) : null}
                    {row.invoice.transferId ? (
                      <p className="mt-1 text-[10px] text-zinc-600">
                        {row.invoice.transferId}
                      </p>
                    ) : null}
                  </td>
                  {showActions ? (
                    <td className="py-4">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          type="button"
                          disabled={isBusy || !row.user.payoutsEnabled}
                          onClick={() => approveAndPay(row)}
                          className="rounded-md border border-emerald-400/40 px-2.5 py-1 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-200 transition-colors hover:bg-emerald-400/10 disabled:opacity-40"
                        >
                          {isBusy && busyId === row.invoice.id
                            ? "Working…"
                            : "Approve & pay"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => reject(row)}
                          className="rounded-md border border-red-400/30 px-2.5 py-1 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ invoice }: { invoice: ContractorInvoice }) {
  const map: Record<ContractorInvoice["status"], string> = {
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
      className={`inline-block rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${map[invoice.status]}`}
    >
      {label[invoice.status]}
    </span>
  );
}

function formatMoney(minor: number, currency: string): string {
  // JPY is zero-decimal in Stripe; everything else we accept is two-decimal.
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
