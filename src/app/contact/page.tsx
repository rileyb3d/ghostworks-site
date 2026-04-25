export const metadata = {
  title: "Contact — Ghostworks",
  description: "Get in touch with Ghostworks.",
};

const EMAIL = "admin@ghostworks3d.com";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-8 pt-32 pb-24 lg:px-16">
      <div className="border-b border-white/[0.06] pb-8">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          Contact
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Get in touch.
        </h1>
      </div>

      <div className="mt-12">
        <p className="font-display text-xs font-medium uppercase tracking-[0.3em] text-zinc-500">
          Email
        </p>
        <a
          href={`mailto:${EMAIL}`}
          data-cursor="pointer"
          className="mt-3 inline-block font-display text-2xl tracking-tight text-white underline-offset-8 transition-colors hover:underline md:text-3xl"
        >
          {EMAIL}
        </a>
      </div>
    </div>
  );
}
