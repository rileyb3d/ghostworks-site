import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { isCurrentUserAdmin } from "@/lib/admin";

// /admin is currently a thin landing — Billing is the only admin area, so we
// redirect straight there. Add real dashboard content here when there are
// other admin sections to navigate to.
export default async function AdminLandingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect_url=/admin");
  }
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }
  redirect("/admin/invoices");
}
