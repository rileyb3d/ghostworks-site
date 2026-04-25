import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { InvoiceForm } from "@/components/admin/InvoiceForm";

export const metadata = {
  title: "New invoice — Ghostworks admin",
};

export default async function AdminInvoicesPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin/invoices");
  }
  if (!(await isCurrentUserAdmin())) {
    // 404 to avoid leaking the existence of the admin area to non-admins.
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-3xl px-8 pt-32 pb-24 lg:px-16">
      <header className="border-b border-white/[0.06] pb-10">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          Admin
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Issue invoice
        </h1>
        <p className="mt-3 text-sm text-zinc-400">
          Creates a Stripe customer if one doesn&apos;t exist, finalizes the
          invoice, and emails the hosted payment link.
        </p>
      </header>
      <div className="mt-12">
        <InvoiceForm />
      </div>
    </div>
  );
}
