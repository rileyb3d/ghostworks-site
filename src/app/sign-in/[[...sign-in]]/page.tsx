import { SignIn } from "@clerk/nextjs";

export const metadata = {
  title: "Sign in — Ghostworks",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6 pt-32">
      <SignIn appearance={{ variables: { colorPrimary: "#ffffff" } }} />
    </div>
  );
}
