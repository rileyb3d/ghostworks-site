"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  status: {
    accountId: string;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
    chargesEnabled: boolean;
    requirementsDue: string[];
  } | null;
};

// Drives the Stripe Connect Express onboarding handoff. Server already
// gates this section to contractors only; here we just mint a fresh
// Account Link on click and redirect.
export function ContractorOnboarding({ status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startOnboarding() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/connect/onboard", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error ?? "Could not start onboarding.");
      }
      window.location.href = data.url;
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const fullyOnboarded = status?.detailsSubmitted && status?.payoutsEnabled;
  const needsMore =
    status && status.detailsSubmitted && !status.payoutsEnabled;

  return (
    <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-xl">
          <h3 className="font-display text-sm font-semibold text-white">
            {fullyOnboarded
              ? "You're set up for payouts."
              : "Complete your payout setup"}
          </h3>
          <p className="mt-2 text-sm text-zinc-400">
            {fullyOnboarded
              ? "Stripe has verified your details. Submitted invoices will pay out to your bank when approved."
              : needsMore
                ? "You started onboarding but Stripe still needs more info before payouts can be enabled."
                : "Provide your identity and bank details through Stripe's secure flow. Takes a few minutes."}
          </p>
          {status?.requirementsDue && status.requirementsDue.length > 0 ? (
            <p className="mt-3 text-xs text-amber-300">
              Outstanding requirements: {status.requirementsDue.join(", ")}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          {status ? (
            <>
              <Badge
                tone={status.detailsSubmitted ? "emerald" : "amber"}
                label={
                  status.detailsSubmitted ? "Details submitted" : "Details pending"
                }
              />
              <Badge
                tone={status.payoutsEnabled ? "emerald" : "amber"}
                label={status.payoutsEnabled ? "Payouts enabled" : "Payouts blocked"}
              />
            </>
          ) : (
            <Badge tone="amber" label="Not started" />
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-md border border-red-400/30 bg-red-400/[0.06] px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={startOnboarding}
          disabled={busy}
          data-cursor="pointer"
          className="rounded-full border border-white/30 bg-white/[0.04] px-6 py-2.5 font-display text-xs font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
        >
          {busy
            ? "Opening…"
            : fullyOnboarded
              ? "Update payout details"
              : status
                ? "Resume onboarding"
                : "Start onboarding"}
        </button>
        <button
          type="button"
          onClick={() => router.refresh()}
          data-cursor="pointer"
          className="rounded-full border border-white/15 px-6 py-2.5 font-display text-xs font-medium uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          Refresh status
        </button>
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
