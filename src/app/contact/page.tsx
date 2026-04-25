import { ContactForm } from "@/components/ContactForm";

export const metadata = {
  title: "Contact — Ghostworks",
  description: "Get in touch with Ghostworks.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-8 pt-32 pb-24 lg:px-16">
      <div className="border-b border-white/[0.06] pb-8">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          Contact
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Tell us about the project.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-zinc-500">
          Briefs, timelines, budgets — the more you share, the faster we can
          come back with something useful.
        </p>
      </div>
      <div className="mt-12">
        <ContactForm />
      </div>
    </div>
  );
}
