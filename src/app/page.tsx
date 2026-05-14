import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-8 lg:px-16">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.05),_transparent_60%)]" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          Ghostworks
        </p>
        <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight md:text-6xl">
          Client portal.
        </h1>
        <p className="mt-5 max-w-md text-sm text-zinc-400 md:text-base">
          Sign in to view invoices, manage retainers, and pay securely.
        </p>

        <div className="mt-12 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
          {isSignedIn ? (
            <Link
              href="/account"
              data-cursor="pointer"
              className="rounded-full bg-white px-8 py-3 text-center font-display text-sm font-medium uppercase tracking-[0.2em] text-black transition-colors hover:bg-zinc-200"
            >
              View account
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                data-cursor="pointer"
                className="rounded-full bg-white px-8 py-3 text-center font-display text-sm font-medium uppercase tracking-[0.2em] text-black transition-colors hover:bg-zinc-200"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                data-cursor="pointer"
                className="rounded-full border border-white/20 px-8 py-3 text-center font-display text-sm font-medium uppercase tracking-[0.2em] text-white transition-colors hover:bg-white hover:text-black"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <p className="mt-10 text-xs text-zinc-600">
          Need to reach us?{" "}
          <Link
            href="/contact"
            className="text-zinc-400 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
