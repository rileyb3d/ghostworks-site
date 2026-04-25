import { PayForm } from "@/components/PayForm";

export const metadata = {
  title: "Pay an invoice — Ghostworks",
  description: "Securely pay your Ghostworks invoice.",
};

type SearchParams = Promise<{ amount?: string; ref?: string }>;

export default async function PayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { amount, ref } = await searchParams;

  return (
    <div className="mx-auto max-w-2xl px-8 pt-32 pb-24 lg:px-16">
      <div className="border-b border-white/[0.06] pb-8">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          Pay an invoice
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Settle your invoice.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-500">
          Enter the amount and reference from your invoice. You&apos;ll be
          redirected to Stripe to complete payment.
        </p>
      </div>
      <div className="mt-12">
        <PayForm initialAmount={amount} initialReference={ref} />
      </div>
    </div>
  );
}
