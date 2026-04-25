import Link from "next/link";

export const metadata = {
  title: "Payment received — Ghostworks",
};

export default function PayThanksPage() {
  return (
    <div className="mx-auto max-w-2xl px-8 pt-32 pb-24 lg:px-16">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          Payment received
        </p>
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">
          Thank you.
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Stripe has confirmed your payment. A receipt will be emailed to you
          shortly.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm text-zinc-400 transition-colors hover:text-white"
          data-cursor="pointer"
        >
          ← Back to Work
        </Link>
      </div>
    </div>
  );
}
