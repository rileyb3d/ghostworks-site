import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";

// Single source of truth for the per-user data we store. Lives in Clerk
// metadata so there's no DB to provision. publicMetadata is readable by
// the user; privateMetadata is server-only.

export type ContractorProfile = {
  role?: string;
  country?: string; // ISO 3166-1 alpha-2 (e.g. "US", "GB")
};

export type ContractorInvoiceStatus =
  | "submitted"
  | "approved"
  | "paid"
  | "rejected";

export type ContractorInvoice = {
  id: string;
  createdAt: number; // ms epoch
  amount: number; // minor units (cents for usd)
  currency: string; // ISO 4217 lowercase
  description: string;
  hours?: number;
  status: ContractorInvoiceStatus;
  paidAt?: number;
  transferId?: string;
  rejectionReason?: string;
};

export type AccountPublicMeta = {
  businessName?: string;
  isContractor?: boolean;
  contractor?: ContractorProfile;
};

export type AccountPrivateMeta = {
  stripeCustomerId?: string;
  stripeConnectAccountId?: string;
  // Submitted/approved/paid invoices for *this* user, when they're a
  // contractor. Capped at MAX_INVOICES_PER_USER to keep metadata size
  // reasonable — Clerk metadata has a hard limit.
  contractorInvoices?: ContractorInvoice[];
};

export type AccountSummary = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  businessName: string | null;
  isContractor: boolean;
  contractor: ContractorProfile | null;
  hasConnectAccount: boolean;
  connectAccountId: string | null;
  createdAt: number;
};

// Clerk's privateMetadata is bounded (~8KB practical). Cap the on-user
// invoice log so it never blows that out. If you bill more than this per
// contractor, time to move invoices into a real DB.
export const MAX_INVOICES_PER_USER = 200;

export function readPublicMeta(user: User): AccountPublicMeta {
  return (user.publicMetadata ?? {}) as AccountPublicMeta;
}

export function readPrivateMeta(user: User): AccountPrivateMeta {
  return (user.privateMetadata ?? {}) as AccountPrivateMeta;
}

export function primaryEmail(user: User): string | null {
  const primary = user.primaryEmailAddressId
    ? user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
    : undefined;
  return primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
}

export function summarize(user: User): AccountSummary {
  const pub = readPublicMeta(user);
  const priv = readPrivateMeta(user);
  return {
    id: user.id,
    email: primaryEmail(user),
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl ?? null,
    businessName: pub.businessName ?? null,
    isContractor: !!pub.isContractor,
    contractor: pub.contractor ?? null,
    hasConnectAccount: !!priv.stripeConnectAccountId,
    connectAccountId: priv.stripeConnectAccountId ?? null,
    createdAt: user.createdAt,
  };
}

// List up to `limit` accounts, sorted newest-first. For larger tenant
// counts paginate via Clerk's offset/limit; we don't bother yet.
export async function listAccounts(limit = 200): Promise<AccountSummary[]> {
  const client = await clerkClient();
  const list = await client.users.getUserList({ limit, orderBy: "-created_at" });
  return list.data.map(summarize);
}

export async function getAccount(userId: string): Promise<AccountSummary | null> {
  const client = await clerkClient();
  try {
    const user = await client.users.getUser(userId);
    return summarize(user);
  } catch (err) {
    console.error(`getAccount(${userId}) failed`, err);
    return null;
  }
}

// Merge-write helpers. Clerk's updateUserMetadata replaces the metadata
// at the top level, so we have to read-then-merge if we want to keep
// other keys intact.

export async function patchPublicMeta(
  userId: string,
  patch: Partial<AccountPublicMeta>,
): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const current = readPublicMeta(user);
  const next: AccountPublicMeta = { ...current, ...patch };
  // Drop undefined keys so we don't litter metadata with null/empty values.
  for (const k of Object.keys(next) as Array<keyof AccountPublicMeta>) {
    if (next[k] === undefined || next[k] === "") {
      delete next[k];
    }
  }
  await client.users.updateUserMetadata(userId, { publicMetadata: next });
}

export async function patchPrivateMeta(
  userId: string,
  patch: Partial<AccountPrivateMeta>,
): Promise<void> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const current = readPrivateMeta(user);
  const next: AccountPrivateMeta = { ...current, ...patch };
  for (const k of Object.keys(next) as Array<keyof AccountPrivateMeta>) {
    if (next[k] === undefined) {
      delete next[k];
    }
  }
  await client.users.updateUserMetadata(userId, { privateMetadata: next });
}

export async function deleteAccount(userId: string): Promise<void> {
  const client = await clerkClient();
  // We intentionally do NOT delete the Stripe customer or Connect account
  // here — keeps payment history resolvable for refunds/receipts. The
  // user.deleted Clerk webhook already follows this same convention.
  await client.users.deleteUser(userId);
}

// Convenience: list all contractor accounts.
export async function listContractors(limit = 500): Promise<AccountSummary[]> {
  const accounts = await listAccounts(limit);
  return accounts.filter((a) => a.isContractor);
}
