import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();
  const isSignedIn = !!userId;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-8 lg:px-16">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster="/video/reentry-poster.jpg"
        aria-hidden="true"
      >
        <source src="/video/reentry.webm" type="video/webm" />
        <source src="/video/reentry.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_25%,_rgba(0,0,0,0.7)_90%)]" />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-300">
          Ghostworks
        </p>
        <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] md:text-6xl">
          Client portal.
        </h1>
        <p className="mt-5 max-w-md text-sm text-zinc-300 md:text-base">
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
                className="rounded-full border border-white/30 bg-white/5 px-8 py-3 text-center font-display text-sm font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-black"
              >
                Create account
              </Link>
            </>
          )}
        </div>

        <p className="mt-10 text-xs text-zinc-400">
          Need to reach us?{" "}
          <Link
            href="/contact"
            className="text-zinc-200 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Get in touch
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
