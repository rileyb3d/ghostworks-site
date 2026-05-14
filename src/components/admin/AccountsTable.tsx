"use client";

import Link from "next/link";
import type { AccountSummary } from "@/lib/users";

type Props = {
  accounts: AccountSummary[];
};

export function AccountsTable({ accounts }: Props) {
  if (accounts.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No accounts yet. New sign-ups will appear here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left font-display text-[11px] font-medium uppercase tracking-[0.18em] text-zinc-500">
            <th className="py-3 pr-4 font-medium">Person</th>
            <th className="py-3 pr-4 font-medium">Email</th>
            <th className="py-3 pr-4 font-medium">Business</th>
            <th className="py-3 pr-4 font-medium">Type</th>
            <th className="py-3 pr-4 font-medium">Joined</th>
            <th className="py-3 text-right font-medium">Manage</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((acc) => {
            const fullName =
              [acc.firstName, acc.lastName].filter(Boolean).join(" ") || "—";
            return (
              <tr
                key={acc.id}
                className="border-b border-white/[0.04] align-top text-zinc-300"
              >
                <td className="py-4 pr-4">
                  <div className="text-zinc-100">{fullName}</div>
                  {acc.isContractor && acc.contractor?.role ? (
                    <div className="mt-0.5 text-[11px] text-zinc-500">
                      {acc.contractor.role}
                    </div>
                  ) : null}
                </td>
                <td className="py-4 pr-4 text-zinc-300">{acc.email ?? "—"}</td>
                <td className="py-4 pr-4 text-zinc-300">
                  {acc.businessName ?? <span className="text-zinc-600">—</span>}
                </td>
                <td className="py-4 pr-4">
                  {acc.isContractor ? (
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${
                        acc.hasConnectAccount
                          ? "bg-emerald-400/15 text-emerald-300"
                          : "bg-amber-400/15 text-amber-300"
                      }`}
                    >
                      {acc.hasConnectAccount
                        ? "Contractor · payouts"
                        : "Contractor · setup"}
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-white/[0.06] px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-300">
                      Client
                    </span>
                  )}
                </td>
                <td className="py-4 pr-4 text-xs text-zinc-500">
                  {formatDate(acc.createdAt)}
                </td>
                <td className="py-4 text-right">
                  <Link
                    href={`/admin/accounts/${acc.id}`}
                    data-cursor="pointer"
                    className="rounded-md border border-white/15 px-3 py-1.5 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-200 transition-colors hover:bg-white hover:text-black"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(ms));
}
