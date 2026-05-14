"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-md border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-white/50 focus:bg-white/[0.06]";
const labelClass =
  "font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-300";

const CURRENCIES = ["USD", "CAD", "EUR", "GBP", "AUD", "NZD", "CHF", "JPY"];

type LineItemDraft = {
  id: string;
  description: string;
  quantity: string;
  unitAmount: string;
};

type Status = "idle" | "submitting" | "success" | "error";

type Props = {
  knownEmails: string[];
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function QuoteForm({ knownEmails }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    pdfUrl: string;
    number: string;
  } | null>(null);

  const [currency, setCurrency] = useState("USD");
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [items, setItems] = useState<LineItemDraft[]>([
    { id: uid(), description: "", quantity: "1", unitAmount: "" },
  ]);

  const totals = useMemo(() => {
    const isJpy = currency === "JPY";
    const minorFromMajor = (n: number) =>
      Number.isFinite(n) ? (isJpy ? Math.round(n) : Math.round(n * 100)) : 0;
    let subtotal = 0;
    for (const li of items) {
      const qty = Number(li.quantity) || 0;
      const unit = Number(li.unitAmount) || 0;
      subtotal += minorFromMajor(qty * unit);
    }
    const disc = minorFromMajor(Number(discount) || 0);
    const t = minorFromMajor(Number(tax) || 0);
    const total = Math.max(0, subtotal - disc + t);
    return { subtotal, total, disc, t };
  }, [items, discount, tax, currency]);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: uid(), description: "", quantity: "1", unitAmount: "" },
    ]);
  }
  function removeItem(id: string) {
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((i) => i.id !== id),
    );
  }
  function updateItem(
    id: string,
    field: keyof Omit<LineItemDraft, "id">,
    value: string,
  ) {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setStatus("submitting");
    setError(null);
    setResult(null);
    const form = new FormData(formEl);

    const payload = {
      client: {
        name: String(form.get("clientName") ?? "").trim(),
        email: String(form.get("clientEmail") ?? "").trim(),
        business: String(form.get("clientBusiness") ?? "").trim() || undefined,
      },
      project: {
        name: String(form.get("projectName") ?? "").trim(),
        summary: String(form.get("projectSummary") ?? "").trim(),
      },
      currency: currency.toLowerCase(),
      validDays: Number(form.get("validDays") ?? 30),
      discount: discount ? Number(discount) : undefined,
      tax: tax ? Number(tax) : undefined,
      notes: String(form.get("notes") ?? "").trim() || undefined,
      lineItems: items.map((li) => ({
        description: li.description.trim(),
        quantity: Number(li.quantity) || 0,
        unitAmount: Number(li.unitAmount) || 0,
      })),
    };

    try {
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        quote?: { number: string; pdfUrl: string };
        error?: string;
      };
      if (!res.ok || !data.ok || !data.quote) {
        throw new Error(data.error ?? "Quote generation failed.");
      }
      setStatus("success");
      setResult({ pdfUrl: data.quote.pdfUrl, number: data.quote.number });
      formEl.reset();
      setItems([
        { id: uid(), description: "", quantity: "1", unitAmount: "" },
      ]);
      setDiscount("");
      setTax("");
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelClass}>Client name</label>
          <input
            name="clientName"
            type="text"
            required
            placeholder="Jane Director"
            className={`mt-2 ${inputClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Client email</label>
          <input
            name="clientEmail"
            type="email"
            required
            list="known-emails"
            placeholder="jane@studio.com"
            className={`mt-2 ${inputClass}`}
          />
          <datalist id="known-emails">
            {knownEmails.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Client business <span className="text-zinc-500">(optional)</span>
        </label>
        <input
          name="clientBusiness"
          type="text"
          placeholder="Studio Name Ltd."
          className={`mt-2 ${inputClass}`}
        />
      </div>

      <div className="space-y-6 rounded-md border border-white/[0.08] bg-white/[0.02] p-5">
        <p className="font-display text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
          Project
        </p>
        <div>
          <label className={labelClass}>Project name</label>
          <input
            name="projectName"
            type="text"
            required
            placeholder="Brand campaign — Spring '26"
            className={`mt-2 ${inputClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Project summary</label>
          <textarea
            name="projectSummary"
            required
            rows={4}
            maxLength={1200}
            placeholder="Short paragraph describing scope, deliverables, and intended use."
            className={`mt-2 ${inputClass} resize-y`}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-display text-[10px] font-medium uppercase tracking-[0.22em] text-zinc-400">
            Line items
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-md border border-white/15 bg-white/[0.04] px-2 py-1 text-xs text-white outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option
                    key={c}
                    value={c}
                    className="bg-zinc-900 text-white"
                  >
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {items.map((li, idx) => (
            <div
              key={li.id}
              className="grid grid-cols-12 gap-3 rounded-md border border-white/[0.06] bg-white/[0.02] p-3"
            >
              <div className="col-span-12 md:col-span-6">
                <label className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Description
                </label>
                <input
                  type="text"
                  value={li.description}
                  onChange={(e) =>
                    updateItem(li.id, "description", e.target.value)
                  }
                  required
                  placeholder={
                    idx === 0
                      ? "e.g. Concept + key visuals"
                      : "e.g. Animation pass"
                  }
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div className="col-span-4 md:col-span-2">
                <label className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Qty
                </label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={li.quantity}
                  onChange={(e) =>
                    updateItem(li.id, "quantity", e.target.value)
                  }
                  required
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div className="col-span-5 md:col-span-3">
                <label className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                  Unit ({currency})
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={li.unitAmount}
                  onChange={(e) =>
                    updateItem(li.id, "unitAmount", e.target.value)
                  }
                  required
                  className={`mt-1 ${inputClass}`}
                />
              </div>
              <div className="col-span-3 md:col-span-1 flex items-end justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(li.id)}
                  disabled={items.length === 1}
                  aria-label="Remove line item"
                  className="rounded-md border border-white/15 px-3 py-2 font-display text-[11px] text-zinc-300 transition-colors hover:bg-red-400/10 hover:text-red-200 disabled:opacity-30"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addItem}
          className="rounded-full border border-white/15 px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          + Add line item
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <label className={labelClass}>
            Discount ({currency}) <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0.00"
            className={`mt-2 ${inputClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>
            Tax ({currency}) <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            type="number"
            min={0}
            step="0.01"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            placeholder="0.00"
            className={`mt-2 ${inputClass}`}
          />
        </div>
        <div>
          <label className={labelClass}>Valid for (days)</label>
          <input
            name="validDays"
            type="number"
            min={1}
            max={365}
            defaultValue={30}
            className={`mt-2 ${inputClass}`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Notes <span className="text-zinc-500">(optional, shows on the PDF)</span>
        </label>
        <textarea
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="Anything not captured by the line items — assumptions, exclusions, timeline notes…"
          className={`mt-2 ${inputClass} resize-y`}
        />
      </div>

      <div className="rounded-md border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between text-sm text-zinc-300">
          <span>Subtotal</span>
          <span className="tabular-nums">
            {formatMoney(totals.subtotal, currency)}
          </span>
        </div>
        {totals.disc > 0 ? (
          <div className="mt-1 flex items-center justify-between text-sm text-zinc-400">
            <span>Discount</span>
            <span className="tabular-nums">
              −{formatMoney(totals.disc, currency)}
            </span>
          </div>
        ) : null}
        {totals.t > 0 ? (
          <div className="mt-1 flex items-center justify-between text-sm text-zinc-400">
            <span>Tax</span>
            <span className="tabular-nums">
              {formatMoney(totals.t, currency)}
            </span>
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-white/[0.08] pt-3 font-display text-base font-semibold text-white">
          <span>Total</span>
          <span className="tabular-nums">
            {formatMoney(totals.total, currency)}
          </span>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {status === "success" && result ? (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100">
          <p className="font-medium">Quote {result.number} ready.</p>
          <p className="mt-2 break-all">
            <a
              href={result.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-white"
            >
              Open PDF
            </a>
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        data-cursor="pointer"
        className="rounded-full border border-white/30 bg-white/[0.04] px-8 py-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
      >
        {status === "submitting" ? "Generating…" : "Generate PDF"}
      </button>
    </form>
  );
}

function formatMoney(minor: number, currency: string): string {
  const isJpy = currency === "JPY";
  const value = minor / (isJpy ? 1 : 100);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${value.toFixed(isJpy ? 0 : 2)} ${currency}`;
  }
}
