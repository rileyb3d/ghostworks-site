import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Only protect routes that genuinely need identity. Everything else stays public
// so feeds/GETs/marketing pages aren't accidentally gated.
const isProtectedRoute = createRouteMatcher([
  "/account(.*)",
  "/api/account(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next internals and static assets unless asked for in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run on API routes.
    "/(api|trpc)(.*)",
  ],
};
