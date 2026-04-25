"use client";

import { useState } from "react";

type Status = "idle" | "submitting" | "success" | "error";
type Mode = "invoice" | "subscription";

type Result =
  | {
      kind: "invoice";
      id: string;
      hostedInvoiceUrl?: string | null;
      invoicePdf?: string | null;
      sent: boolean;
    }
  | {
      kind: "subscription";
      id: string;
      checkoutUrl: string;
      emailSent: boolean;
      emailError?: string | null;
    };

const inputClass =
  "w-full rounded-md border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none transition-colors focus:border-white/50 focus:bg-white/[0.06]";

const labelClass =
  "font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-300";

const intervalOptions: Array<{
  value: string;
  label: string;
  interval: "day" | "week" | "month" | "year";
  interval_count: number;
}> = [
  { value: "weekly", label: "Weekly", interval: "week", interval_count: 1 },
  { value: "monthly", label: "Monthly", interval: "month", interval_count: 1 },
  { value: "quarterly", label: "Every 3 months", interval: "month", interval_count: 3 },
  { value: "biannual", label: "Every 6 months", interval: "month", interval_count: 6 },
  { value: "yearly", label: "Yearly", interval: "year", interval_count: 1 },
];

export function InvoiceForm({ knownEmails }: { knownEmails: string[] }) {
  const [mode, setMode] = useState<Mode>("invoice");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);
    setResult(null);

    const form = new FormData(e.currentTarget);

    if (mode === "invoice") {
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
          kind: "invoice",
          id: data.invoiceId,
          hostedInvoiceUrl: data.hostedInvoiceUrl ?? null,
          invoicePdf: data.invoicePdf ?? null,
          sent: !!data.sent,
        });
        e.currentTarget.reset();
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
      return;
    }

    const intervalKey = String(form.get("intervalKey") ?? "monthly");
    const intervalOpt = intervalOptions.find((i) => i.value === intervalKey) ?? intervalOptions[1];
    const payload = {
      email: String(form.get("email") ?? "").trim(),
      name: String(form.get("name") ?? "").trim() || undefined,
      amount: Number(form.get("amount") ?? 0),
      description: String(form.get("description") ?? "").trim(),
      interval: intervalOpt.interval,
      intervalCount: intervalOpt.interval_count,
    };
    try {
      const res = await fetch("/api/admin/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        checkoutSessionId?: string;
        checkoutUrl?: string;
        emailSent?: boolean;
        emailError?: string | null;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.checkoutSessionId || !data.checkoutUrl) {
        throw new Error(data.error ?? "Could not create subscription setup link.");
      }
      setStatus("success");
      setResult({
        kind: "subscription",
        id: data.checkoutSessionId,
        checkoutUrl: data.checkoutUrl,
        emailSent: !!data.emailSent,
        emailError: data.emailError ?? null,
      });
      e.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-7">
      <div className="flex gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
        <ModeButton active={mode === "invoice"} onClick={() => setMode("invoice")}>
          One-off invoice
        </ModeButton>
        <ModeButton active={mode === "subscription"} onClick={() => setMode("subscription")}>
          Recurring payment
        </ModeButton>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className={labelClass}>Customer email</label>
          <input
            name="email"
            type="email"
            required
            list="known-emails"
            autoComplete="off"
            placeholder="client@example.com"
            className={`mt-2 ${inputClass}`}
          />
          <datalist id="known-emails">
            {knownEmails.map((e) => (
              <option key={e} value={e} />
            ))}
          </datalist>
        </div>
        <div>
          <label className={labelClass}>
            Customer name <span className="text-zinc-500">(optional)</span>
          </label>
          <input
            name="name"
            type="text"
            placeholder="Acme Corp."
            className={`mt-2 ${inputClass}`}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Amount (USD)</label>
        <div className="relative mt-2">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
            $
          </span>
          <input
            name="amount"
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            required
            className={`${inputClass} pl-8`}
          />
        </div>
        {mode === "subscription" ? (
          <p className="mt-2 text-xs text-zinc-500">
            Charged every billing cycle. Customer pays each cycle via emailed
            invoice link.
          </p>
        ) : null}
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <input
          name="description"
          type="text"
          required
          maxLength={250}
          placeholder={
            mode === "subscription"
              ? "e.g. Brand retainer"
              : "e.g. Brand campaign — milestone 2"
          }
          className={`mt-2 ${inputClass}`}
        />
      </div>

      {mode === "subscription" ? (
        <div>
          <label className={labelClass}>Billing cycle</label>
          <select
            name="intervalKey"
            defaultValue="monthly"
            className={`mt-2 ${inputClass}`}
          >
            {intervalOptions.map((o) => (
              <option key={o.value} value={o.value} className="bg-zinc-900 text-white">
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-zinc-500">
            Customer gets emailed a one-time setup link to enter their card.
            After that Stripe auto-charges every cycle.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className={labelClass}>Days until due</label>
            <input
              name="daysUntilDue"
              type="number"
              min={0}
              max={365}
              defaultValue={14}
              className={`mt-2 ${inputClass}`}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3 self-end pb-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              name="send"
              defaultChecked
              className="h-4 w-4 cursor-pointer accent-white"
            />
            Email hosted invoice link to customer
          </label>
        </div>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {status === "success" && result ? (
        <div className="rounded-md border border-emerald-400/40 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100">
          {result.kind === "invoice" ? (
            <>
              <p className="font-medium">
                Invoice {result.sent ? "sent" : "finalized"} ({result.id}).
              </p>
              {result.hostedInvoiceUrl ? (
                <p className="mt-1">
                  <a
                    href={result.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-white"
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
                        className="underline underline-offset-2 hover:text-white"
                      >
                        PDF
                      </a>
                    </>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="font-medium">
                Setup link created.
                {result.emailSent
                  ? " Customer was emailed the link."
                  : " Email failed — send the link manually below."}
              </p>
              {result.emailError ? (
                <p className="mt-1 text-emerald-300/80">{result.emailError}</p>
              ) : null}
              <p className="mt-2 break-all">
                <a
                  href={result.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  {result.checkoutUrl}
                </a>
              </p>
            </>
          )}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        data-cursor="pointer"
        className="rounded-full border border-white/30 bg-white/[0.04] px-8 py-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
      >
        {status === "submitting"
          ? "Creating…"
          : mode === "invoice"
            ? "Create invoice"
            : "Start subscription"}
      </button>
    </form>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-cursor="pointer"
      className={`flex-1 rounded-full px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.2em] transition-colors ${
        active
          ? "bg-white text-black"
          : "text-zinc-300 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
