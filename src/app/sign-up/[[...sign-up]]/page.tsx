import { SignUp } from "@clerk/nextjs";

export const metadata = {
  title: "Sign up — Ghostworks",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-6 pt-32">
      <SignUp appearance={{ variables: { colorPrimary: "#ffffff" } }} />
    </div>
  );
}
