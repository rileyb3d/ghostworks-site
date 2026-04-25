import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export const metadata = {
  title: "Account — Ghostworks",
};

export default async function AccountPage() {
  const user = await currentUser();

  return (
    <div className="mx-auto max-w-3xl px-8 pt-32 pb-24 lg:px-16">
      <div className="flex items-start justify-between border-b border-white/[0.06] pb-8">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.4em] text-zinc-500">
            Account
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
            {user?.firstName ? `Hi, ${user.firstName}.` : "Welcome back."}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
        <UserButton appearance={{ variables: { colorPrimary: "#ffffff" } }} />
      </div>
      <p className="mt-8 text-sm text-zinc-400">
        This is a protected area. Add invoices, project files, and client tools here.
      </p>
    </div>
  );
}
