import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Create a client account — Ghostworks",
};

export default function SignUpPage() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center gap-10 px-6 pt-32 pb-16 lg:flex-row lg:items-start lg:gap-20">
      <div className="max-w-md text-center lg:text-left">
        <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
          Client account
        </p>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight md:text-5xl">
          Create your account.
        </h1>
        <p className="mt-4 text-sm text-zinc-400">
          Track project invoices, manage retainers, and pay securely — all in
          one place.
        </p>
      </div>
      <SignUp
        appearance={{ variables: { colorPrimary: "#ffffff" } }}
        signInUrl="/sign-in"
        forceRedirectUrl="/account"
      />
    </div>
  );
}
