"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AccountSummary } from "@/lib/users";

type Props = {
  account: AccountSummary;
};

type Status = "idle" | "saving" | "success" | "error";

const inputClass =
  "w-full rounded-md border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-white/50 focus:bg-white/[0.06]";
const labelClass =
  "font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-300";

export function AccountEditor({ account }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState(account.businessName ?? "");
  const [isContractor, setIsContractor] = useState(account.isContractor);
  const [role, setRole] = useState(account.contractor?.role ?? "");
  const [country, setCountry] = useState(account.contractor?.country ?? "");

  const [connectBusy, setConnectBusy] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  const [deleting, setDeleting] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        businessName: businessName.trim() || null,
        isContractor,
      };
      if (isContractor) {
        payload.contractor = {
          role: role.trim() || undefined,
          country: country.trim().toUpperCase() || undefined,
        };
      } else {
        payload.contractor = null;
      }
      const res = await fetch(`/api/admin/users/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not save changes.");
      }
      setStatus("success");
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function onProvisionConnect(withLink: boolean) {
    setConnectBusy(true);
    setError(null);
    setOnboardingUrl(null);
    try {
      const res = await fetch(
        `/api/admin/users/${account.id}/connect${withLink ? "?link=1" : ""}`,
        { method: "POST" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        onboardingUrl?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Stripe Connect provisioning failed.");
      }
      if (withLink && data.onboardingUrl) {
        setOnboardingUrl(data.onboardingUrl);
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setConnectBusy(false);
    }
  }

  async function onDelete() {
    const ok = window.confirm(
      `Permanently delete the account for ${account.email ?? account.id}?\n\n` +
        `This removes their Clerk login and any /account access. ` +
        `Stripe payment history is preserved.`,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${account.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Delete failed.");
      }
      router.push("/admin/accounts");
      router.refresh();
    } catch (err) {
      setDeleting(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="space-y-12">
      <form onSubmit={onSave} className="space-y-7">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className={labelClass}>Business name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              maxLength={120}
              placeholder="Acme Studio Ltd."
              className={`mt-2 ${inputClass}`}
            />
          </div>
          <div>
            <label className={labelClass}>Account type</label>
            <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={isContractor}
                onChange={(e) => setIsContractor(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-white"
              />
              Treat as contractor (enables payouts)
            </label>
          </div>
        </div>

        {isContractor ? (
          <div className="grid gap-6 rounded-md border border-white/[0.08] bg-white/[0.02] p-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
                Contractor profile
              </p>
            </div>
            <div>
              <label className={labelClass}>Role / title</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                maxLength={80}
                placeholder="Senior 3D Generalist"
                className={`mt-2 ${inputClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Country (2-letter ISO)</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                maxLength={2}
                placeholder="US"
                className={`mt-2 ${inputClass} uppercase`}
              />
              <p className="mt-1 text-[11px] text-zinc-500">
                Used when provisioning their Stripe Connect account. Cannot be
                changed after onboarding.
              </p>
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {status === "success" ? (
          <p className="rounded-md border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-2 text-sm text-emerald-200">
            Saved.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={status === "saving" || pending}
          data-cursor="pointer"
          className="rounded-full border border-white/30 bg-white/[0.04] px-8 py-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
        >
          {status === "saving" ? "Saving…" : "Save changes"}
        </button>
      </form>

      {isContractor ? (
        <section className="rounded-md border border-white/[0.08] bg-white/[0.02] p-6">
          <h3 className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-300">
            Stripe Connect (payouts)
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            {account.hasConnectAccount
              ? `Connected account: ${account.connectAccountId}`
              : "No Connect account yet. Provision one so this contractor can complete onboarding."}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {!account.hasConnectAccount ? (
              <button
                type="button"
                onClick={() => onProvisionConnect(false)}
                disabled={connectBusy}
                data-cursor="pointer"
                className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
              >
                {connectBusy ? "Working…" : "Provision Connect account"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onProvisionConnect(true)}
              disabled={connectBusy}
              data-cursor="pointer"
              className="rounded-full border border-white/20 bg-white/[0.04] px-5 py-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
            >
              {connectBusy
                ? "Working…"
                : account.hasConnectAccount
                  ? "Generate onboarding link"
                  : "Provision + onboarding link"}
            </button>
          </div>

          {onboardingUrl ? (
            <div className="mt-5 rounded-md border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100">
              <p className="font-medium">Send this link to the contractor:</p>
              <p className="mt-2 break-all">
                <a
                  href={onboardingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  {onboardingUrl}
                </a>
              </p>
              <p className="mt-2 text-[11px] text-emerald-200/80">
                The link is single-use and expires shortly. The contractor can
                also start onboarding themselves from their /account page.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-md border border-red-400/30 bg-red-400/[0.04] p-6">
        <h3 className="font-display text-xs font-medium uppercase tracking-[0.3em] text-red-300">
          Danger zone
        </h3>
        <p className="mt-2 text-sm text-zinc-300">
          Permanently deletes this user&apos;s Clerk login. Their Stripe payment
          history (invoices, subscriptions, transfers) stays intact for
          accounting and refunds.
        </p>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          data-cursor="pointer"
          className="mt-5 rounded-full border border-red-400/40 bg-red-400/[0.06] px-5 py-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-red-200 transition-colors hover:bg-red-400/20 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete account"}
        </button>
      </section>
    </div>
  );
}
