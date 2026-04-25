"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";

type Result = {
  invoiceId: string;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  sent: boolean;
};

export function InvoiceForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      name: String(form.get("name") ?? "").trim() || undefined,
      amount: Number(form.get("amount") ?? 0),
      description: String(form.get("description") ?? "").trim(),
      send: form.get("send") === "on",
      daysUntilDue: Number(form.get("daysUntilDue") ?? 14),
    };

    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        invoiceId?: string;
        hostedInvoiceUrl?: string | null;
        invoicePdf?: string | null;
        sent?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.invoiceId) {
        throw new Error(data.error ?? "Could not create invoice.");
      }
      setStatus("success");
      setResult({
        invoiceId: data.invoiceId,
        hostedInvoiceUrl: data.hostedInvoiceUrl ?? null,
        invoicePdf: data.invoicePdf ?? null,
        sent: !!data.sent,
      });
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
            Customer email
          </label>
          <input
            name="email"
            type="email"
            required
            autoComplete="off"
            placeholder="client@example.com"
            className="mt-2 w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none transition-colors focus:border-white/40"
          />
        </div>
        <div>
          <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
            Customer name <span className="text-zinc-700">(optional)</span>
          </label>
          <input
            name="name"
            type="text"
            placeholder="Acme Corp."
            className="mt-2 w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none transition-colors focus:border-white/40"
          />
        </div>
      </div>

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
            min={1}
            step="0.01"
            required
            className="w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 pl-8 text-sm text-white outline-none transition-colors focus:border-white/40"
          />
        </div>
      </div>

      <div>
        <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Description
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
            Days until due
          </label>
          <input
            name="daysUntilDue"
            type="number"
            min={0}
            max={365}
            defaultValue={14}
            className="mt-2 w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3 self-end pb-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            name="send"
            defaultChecked
            className="h-4 w-4 cursor-pointer accent-white"
          />
          Email hosted invoice link to customer
        </label>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {status === "success" && result ? (
        <div className="rounded-md border border-emerald-400/30 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">
          <p className="font-medium">
            Invoice {result.sent ? "sent" : "finalized"} ({result.invoiceId}).
          </p>
          {result.hostedInvoiceUrl ? (
            <p className="mt-1">
              <a
                href={result.hostedInvoiceUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-emerald-100"
              >
                Open hosted invoice
              </a>
              {result.invoicePdf ? (
                <>
                  {" · "}
                  <a
                    href={result.invoicePdf}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-emerald-100"
                  >
                    PDF
                  </a>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        data-cursor="pointer"
        className="rounded-full border border-white/20 px-8 py-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
      >
        {status === "submitting" ? "Creating…" : "Create invoice"}
      </button>
    </form>
  );
}
