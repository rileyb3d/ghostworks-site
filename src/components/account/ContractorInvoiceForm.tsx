"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Status = "idle" | "submitting" | "success" | "error";

const inputClass =
  "w-full rounded-md border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-white/50 focus:bg-white/[0.06]";
const labelClass =
  "font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-300";

const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "NZD", "CHF", "JPY"];

type Props = {
  disabled?: boolean;
  disabledHint?: string | null;
};

export function ContractorInvoiceForm({ disabled, disabledHint }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus("submitting");
    setError(null);

    const form = new FormData(formEl);
    const payload = {
      amount: Number(form.get("amount") ?? 0),
      currency: String(form.get("currency") ?? "USD").toLowerCase(),
      description: String(form.get("description") ?? "").trim(),
      hours: form.get("hours") ? Number(form.get("hours")) : undefined,
    };

    try {
      const res = await fetch("/api/account/contractor/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Could not submit.");
      }
      setStatus("success");
      formEl.reset();
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {disabled && disabledHint ? (
        <p className="rounded-md border border-amber-400/30 bg-amber-400/[0.06] px-4 py-2 text-sm text-amber-200">
          {disabledHint}
        </p>
      ) : null}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className={labelClass}>Description</label>
          <input
            name="description"
            type="text"
            required
            maxLength={250}
            placeholder="e.g. Acme campaign — Week of Mar 18"
            disabled={disabled}
            className={`mt-2 ${inputClass} disabled:opacity-50`}
          />
        </div>
        <div>
          <label className={labelClass}>Hours (optional)</label>
          <input
            name="hours"
            type="number"
            min={0}
            step="0.25"
            placeholder="e.g. 12.5"
            disabled={disabled}
            className={`mt-2 ${inputClass} disabled:opacity-50`}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className={labelClass}>Amount</label>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            required
            disabled={disabled}
            className={`mt-2 ${inputClass} disabled:opacity-50`}
          />
        </div>
        <div>
          <label className={labelClass}>Currency</label>
          <select
            name="currency"
            defaultValue="USD"
            disabled={disabled}
            className={`mt-2 ${inputClass} disabled:opacity-50`}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c} className="bg-zinc-900 text-white">
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {status === "success" ? (
        <p className="rounded-md border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-2 text-sm text-emerald-200">
          Submitted. An admin will review it before payout.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={disabled || status === "submitting"}
        data-cursor="pointer"
        className="rounded-full border border-white/30 bg-white/[0.04] px-8 py-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit invoice"}
      </button>
    </form>
  );
}
