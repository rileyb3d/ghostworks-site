import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { listAccounts } from "@/lib/users";
import { AccountsTable } from "@/components/admin/AccountsTable";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  title: "Accounts — Ghostworks admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAccountsPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/accounts");
  }
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }

  const accounts = await listAccounts(500);
  const contractors = accounts.filter((a) => a.isContractor);
  const payoutReady = contractors.filter((a) => a.hasConnectAccount);

  return (
    <div className="mx-auto max-w-6xl px-8 pt-32 pb-24 lg:px-16">
      <AdminNav />
      <header className="border-b border-white/[0.06] pb-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
          Admin
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Accounts
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-zinc-300">
          Everyone who&apos;s signed up. Edit business names, promote clients to
          contractors, or remove accounts.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Stat label="Accounts" value={accounts.length.toString()} />
        <Stat
          label="Contractors"
          value={contractors.length.toString()}
          hint={`${payoutReady.length} payout-ready`}
        />
        <Stat
          label="Clients"
          value={(accounts.length - contractors.length).toString()}
        />
      </div>

      <section className="mt-14">
        <div className="border-b border-white/[0.06] pb-4">
          <h2 className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
            All accounts
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Sorted newest first. Click Edit to manage an account.
          </p>
        </div>
        <div className="mt-6">
          <AccountsTable accounts={accounts} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-white/[0.08] bg-white/[0.02] px-5 py-4">
      <p className="font-display text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}
