import { clerkClient } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";

// Map Clerk user -> Stripe customer ID, persisted in Clerk privateMetadata.
// We avoid standing up a DB just for this — Clerk metadata is server-only and
// is a fine home for the mapping. Stripe stays the source of truth for any
// billing data; we just remember the customer ID.

const META_KEY = "stripeCustomerId";

type PrivateMeta = { [META_KEY]?: string };

export async function getOrCreateStripeCustomerId(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);

  const existing = (user.privateMetadata as PrivateMeta | undefined)?.[META_KEY];
  if (existing) return existing;

  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress;
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined;

  const stripe = getStripe();

  // De-dupe: if a customer with this email already exists (e.g. a previous
  // anonymous /pay submission), reuse it instead of creating a duplicate.
  let customerId: string | undefined;
  if (email) {
    const found = await stripe.customers.list({ email, limit: 1 });
    customerId = found.data[0]?.id;
  }

  if (!customerId) {
    const created = await stripe.customers.create({
      email,
      name,
      metadata: { clerkUserId: userId },
    });
    customerId = created.id;
  }

  await client.users.updateUserMetadata(userId, {
    privateMetadata: { [META_KEY]: customerId } satisfies PrivateMeta,
  });

  return customerId;
}

// Mirror Clerk profile changes (email, name) onto the Stripe customer so
// invoices and receipts always reflect the latest contact info.
export async function syncStripeCustomerFromClerk(
  userId: string,
  data: { email?: string; name?: string },
): Promise<void> {
  const customerId = await getOrCreateStripeCustomerId(userId);
  await getStripe().customers.update(customerId, {
    email: data.email,
    name: data.name,
  });
}
