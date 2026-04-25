"use client";

import { useEffect, useState } from "react";

type Status = "idle" | "submitting" | "error";

export function PayForm({
  initialAmount,
  initialReference,
}: {
  initialAmount?: string;
  initialReference?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(initialAmount ?? "");
  const [reference, setReference] = useState(initialReference ?? "");

  useEffect(() => {
    if (initialAmount) setAmount(initialAmount);
    if (initialReference) setReference(initialReference);
  }, [initialAmount, initialReference]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      amount: Number(form.get("amount") ?? 0),
      description: String(form.get("description") ?? "").trim(),
      email: String(form.get("email") ?? "").trim() || undefined,
      reference: String(form.get("reference") ?? "").trim() || undefined,
    };

    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }
      window.location.href = data.url;
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Amount (USD)
        </label>
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
            $
          </span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min={25}
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 pl-8 text-sm text-white outline-none transition-colors focus:border-white/40"
          />
        </div>
      </div>

      <div>
        <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Project / description
        </label>
        <input
          name="description"
          type="text"
          required
          maxLength={250}
          placeholder="e.g. Brand campaign — milestone 2"
          className="mt-2 w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none transition-colors focus:border-white/40"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
            Invoice # <span className="text-zinc-700">(optional)</span>
          </label>
          <input
            name="reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="mt-2 w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
          />
        </div>
        <div>
          <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
            Email <span className="text-zinc-700">(optional)</span>
          </label>
          <input
            name="email"
            type="email"
            autoComplete="email"
            className="mt-2 w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        data-cursor="pointer"
        className="rounded-full border border-white/20 px-8 py-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
      >
        {status === "submitting" ? "Redirecting…" : "Continue to payment"}
      </button>

      <p className="text-xs text-zinc-600">
        Secure checkout by Stripe. We never see or store card details.
      </p>
    </form>
  );
}
