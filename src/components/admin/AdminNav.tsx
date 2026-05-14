"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/invoices", label: "Billing" },
  { href: "/admin/quotes", label: "Quotes" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/payouts", label: "Payouts" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-10 flex gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            data-cursor="pointer"
            className={`flex-1 rounded-full px-4 py-2 text-center font-display text-xs font-medium uppercase tracking-[0.2em] transition-colors ${
              active
                ? "bg-white text-black"
                : "text-zinc-300 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
