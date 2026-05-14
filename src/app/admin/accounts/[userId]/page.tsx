import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { getAccount } from "@/lib/users";
import { getConnectStatus } from "@/lib/contractor";
import { AccountEditor } from "@/components/admin/AccountEditor";

export const metadata = {
  title: "Account — Ghostworks admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAccountDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: adminId } = await auth();
  if (!adminId) {
    redirect("/sign-in?redirect_url=/admin/accounts");
  }
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }

  const { userId } = await params;
  const account = await getAccount(userId);
  if (!account) notFound();

  const connectStatus = account.hasConnectAccount
    ? await getConnectStatus(userId)
    : null;
  const fullName =
    [account.firstName, account.lastName].filter(Boolean).join(" ") ||
    account.email ||
    account.id;

  return (
    <div className="mx-auto max-w-3xl px-8 pt-32 pb-24 lg:px-16">
      <Link
        href="/admin/accounts"
        className="font-display text-[11px] font-medium uppercase tracking-[0.3em] text-zinc-500 transition-colors hover:text-white"
        data-cursor="pointer"
      >
        ← All accounts
      </Link>
      <header className="mt-6 border-b border-white/[0.06] pb-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-400">
          {account.isContractor ? "Contractor" : "Client"}
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          {fullName}
        </h1>
        {account.email ? (
          <p className="mt-2 text-sm text-zinc-500">{account.email}</p>
        ) : null}

        {connectStatus ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge
              tone={connectStatus.detailsSubmitted ? "emerald" : "amber"}
              label={
                connectStatus.detailsSubmitted
                  ? "Details submitted"
                  : "Onboarding pending"
              }
            />
            <Badge
              tone={connectStatus.payoutsEnabled ? "emerald" : "amber"}
              label={
                connectStatus.payoutsEnabled
                  ? "Payouts enabled"
                  : "Payouts blocked"
              }
            />
            {connectStatus.requirementsDue.length > 0 ? (
              <Badge
                tone="red"
                label={`${connectStatus.requirementsDue.length} requirement(s) due`}
              />
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="mt-10">
        <AccountEditor account={account} />
      </div>
    </div>
  );
}

function Badge({
  tone,
  label,
}: {
  tone: "emerald" | "amber" | "red";
  label: string;
}) {
  const classes =
    tone === "emerald"
      ? "bg-emerald-400/15 text-emerald-300"
      : tone === "amber"
        ? "bg-amber-400/15 text-amber-300"
        : "bg-red-400/15 text-red-300";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 font-display text-[10px] font-medium uppercase tracking-[0.18em] ${classes}`}
    >
      {label}
    </span>
  );
}
