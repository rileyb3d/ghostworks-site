"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Quote } from "@/lib/quotes";

type Props = {
  quotes: Quote[];
};

export function QuotesTable({ quotes }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onDelete(quote: Quote) {
    if (
      !window.confirm(
        `Delete quote ${quote.number}? The PDF will be removed and the link will stop working.`,
      )
    ) {
      return;
    }
    setError(null);
    setBusyId(quote.id);
    try {
      const res = await fetch(`/api/admin/quotes/${quote.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Delete failed.");
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusyId(null);
    }
  }

  if (quotes.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No quotes yet. Generate one above and it&apos;ll appear here.
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
              <th className="py-3 pr-4 font-medium">Quote</th>
              <th className="py-3 pr-4 font-medium">Client</th>
              <th className="py-3 pr-4 font-medium">Project</th>
              <th className="py-3 pr-4 font-medium">Issued</th>
              <th className="py-3 pr-4 font-medium">Valid until</th>
              <th className="py-3 pr-4 text-right font-medium">Total</th>
              <th className="py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const isBusy = busyId === q.id;
              return (
                <tr
                  key={q.id}
                  className="border-b border-white/[0.04] align-top text-zinc-300"
                >
                  <td className="py-4 pr-4 text-zinc-100">{q.number}</td>
                  <td className="py-4 pr-4">
                    <div className="text-zinc-100">{q.client.name}</div>
                    {q.client.business ? (
                      <div className="mt-0.5 text-[11px] text-zinc-500">
                        {q.client.business}
                      </div>
                    ) : null}
                    <div className="mt-0.5 text-[11px] text-zinc-600">
                      {q.client.email}
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-zinc-200">{q.project.name}</td>
                  <td className="py-4 pr-4 text-xs text-zinc-500">
                    {formatDate(q.createdAt)}
                  </td>
                  <td className="py-4 pr-4 text-xs text-zinc-500">
                    {formatDate(q.validUntil)}
                  </td>
                  <td className="py-4 pr-4 text-right text-zinc-100 tabular-nums">
                    {formatMoney(q.total, q.currency)}
                  </td>
                  <td className="py-4">
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <a
                        href={q.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-300 underline underline-offset-2 hover:text-white"
                      >
                        Open PDF
                      </a>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onDelete(q)}
                        className="rounded-md border border-red-400/30 px-2 py-1 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-red-300 transition-colors hover:bg-red-400/10 disabled:opacity-50"
                      >
                        {isBusy ? "Deleting…" : "Delete"}
                      </button>
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
