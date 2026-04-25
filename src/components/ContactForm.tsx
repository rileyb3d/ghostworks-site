"use client";

import { useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";

type Status = "idle" | "submitting" | "ok" | "error";

export function ContactForm() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      message: String(form.get("message") ?? ""),
      turnstileToken: token,
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setStatus("ok");
      e.currentTarget.reset();
      setToken(null);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-8">
        <p className="font-display text-xl">Message received.</p>
        <p className="mt-2 text-sm text-zinc-500">
          We&apos;ll be in touch within a couple of business days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Field label="Name" name="name" type="text" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <div>
        <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Message
        </label>
        <textarea
          name="message"
          required
          rows={6}
          className="mt-2 w-full resize-none rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
        />
      </div>

      {siteKey ? (
        <Turnstile
          siteKey={siteKey}
          onSuccess={setToken}
          onError={() => setToken(null)}
          onExpire={() => setToken(null)}
          options={{ theme: "dark" }}
        />
      ) : (
        <p className="text-xs text-amber-400/80">
          Turnstile site key not set. Form will be sent without bot check (dev only).
        </p>
      )}

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="submit"
        disabled={status === "submitting"}
        data-cursor="pointer"
        className="rounded-full border border-white/20 px-8 py-3 font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
        {label}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="mt-2 w-full rounded-md border border-white/[0.08] bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors focus:border-white/40"
      />
    </div>
  );
}
