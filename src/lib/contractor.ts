import { randomUUID } from "crypto";
import type Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import {
  MAX_INVOICES_PER_USER,
  patchPrivateMeta,
  primaryEmail,
  readPrivateMeta,
  readPublicMeta,
} from "@/lib/users";
import type { ContractorInvoice } from "@/lib/users";

// Stripe Connect (Express) lifecycle for contractors:
//   1. Admin marks a user as contractor (publicMetadata.isContractor = true)
//      + optionally sets role/country.
//   2. We lazily create a Stripe Connect Express account on first onboarding
//      kick-off, storing the ID in privateMetadata.stripeConnectAccountId.
//   3. Contractor visits /account, clicks "Complete payout setup" → we mint
//      a one-time Stripe Account Link and 302 them into the hosted flow.
//   4. After Stripe redirects them back, we re-pull the account to check
//      `details_submitted` / `payouts_enabled`.
//   5. Admin pays a contractor invoice → stripe.transfers.create() moves
//      funds from the platform balance to the connected account.
//
// Requires Stripe Connect to be enabled on the platform account in the
// Stripe dashboard. In test mode, your platform balance must be funded
// for transfers to succeed.

export type ConnectStatus = {
  accountId: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  requirementsDue: string[];
};

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

// Look up (or create) the Connect Express account ID for this user.
// We only create when the user is flagged as a contractor — this keeps
// us from minting Stripe accounts for regular clients.
export async function getOrCreateConnectAccountId(userId: string): Promise<string> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const priv = readPrivateMeta(user);
  if (priv.stripeConnectAccountId) return priv.stripeConnectAccountId;

  const pub = readPublicMeta(user);
  if (!pub.isContractor) {
    throw new Error("User is not flagged as a contractor.");
  }

  const stripe = getStripe();
  const email = primaryEmail(user) ?? undefined;
  const country = pub.contractor?.country?.toUpperCase() ?? "US";

  const account = await stripe.accounts.create({
    type: "express",
    email,
    country,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: { clerkUserId: userId },
  });

  await patchPrivateMeta(userId, { stripeConnectAccountId: account.id });
  return account.id;
}

// Return a fresh single-use onboarding URL. Account Links expire quickly
// (Stripe-controlled), so we mint a new one every time the contractor
// clicks the button rather than caching it.
export async function createOnboardingLink(userId: string): Promise<string> {
  const accountId = await getOrCreateConnectAccountId(userId);
  const stripe = getStripe();
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl()}/account?onboarding=refresh`,
    return_url: `${appUrl()}/account?onboarding=complete`,
    type: "account_onboarding",
  });
  return link.url;
}

export async function getConnectStatus(userId: string): Promise<ConnectStatus | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const priv = readPrivateMeta(user);
  if (!priv.stripeConnectAccountId) return null;

  const stripe = getStripe();
  try {
    const account = await stripe.accounts.retrieve(priv.stripeConnectAccountId);
    return {
      accountId: account.id,
      detailsSubmitted: !!account.details_submitted,
      payoutsEnabled: !!account.payouts_enabled,
      chargesEnabled: !!account.charges_enabled,
      requirementsDue: account.requirements?.currently_due ?? [],
    };
  } catch (err) {
    console.error(`getConnectStatus(${userId}) failed`, err);
    return null;
  }
}

// Append a new submitted invoice to the contractor's metadata. Trims to
// MAX_INVOICES_PER_USER, dropping the oldest paid/rejected entries first.
export async function submitContractorInvoice(
  userId: string,
  input: { amount: number; currency: string; description: string; hours?: number },
): Promise<ContractorInvoice> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const pub = readPublicMeta(user);
  if (!pub.isContractor) {
    throw new Error("Only contractors can submit invoices.");
  }
  const priv = readPrivateMeta(user);

  const entry: ContractorInvoice = {
    id: randomUUID(),
    createdAt: Date.now(),
    amount: Math.round(input.amount),
    currency: input.currency.toLowerCase(),
    description: input.description.trim(),
    hours: input.hours,
    status: "submitted",
  };

  const existing = priv.contractorInvoices ?? [];
  // Keep "submitted" entries at the front (so admin sees newest-first).
  let merged: ContractorInvoice[] = [entry, ...existing];
  if (merged.length > MAX_INVOICES_PER_USER) {
    // Prefer to drop terminal-state entries (paid/rejected) over open ones.
    const open = merged.filter(
      (e) => e.status === "submitted" || e.status === "approved",
    );
    const terminal = merged.filter(
      (e) => e.status === "paid" || e.status === "rejected",
    );
    const keepTerminal = Math.max(0, MAX_INVOICES_PER_USER - open.length);
    merged = [...open, ...terminal.slice(0, keepTerminal)];
  }

  await patchPrivateMeta(userId, { contractorInvoices: merged });
  return entry;
}

// Mutate a single invoice on a contractor. Returns the updated entry.
async function updateContractorInvoice(
  userId: string,
  invoiceId: string,
  mutate: (entry: ContractorInvoice) => ContractorInvoice,
): Promise<ContractorInvoice> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const priv = readPrivateMeta(user);
  const existing = priv.contractorInvoices ?? [];
  const idx = existing.findIndex((e) => e.id === invoiceId);
  if (idx < 0) {
    throw new Error("Invoice not found for this contractor.");
  }
  const next = [...existing];
  const updated = mutate(next[idx]);
  next[idx] = updated;
  await patchPrivateMeta(userId, { contractorInvoices: next });
  return updated;
}

// Approve a submitted invoice and immediately transfer funds from the
// platform balance to the contractor's connected account.
export async function approveAndPayInvoice(
  userId: string,
  invoiceId: string,
): Promise<{ invoice: ContractorInvoice; transfer: Stripe.Transfer }> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const priv = readPrivateMeta(user);
  const accountId = priv.stripeConnectAccountId;
  if (!accountId) {
    throw new Error("Contractor has no Stripe Connect account yet.");
  }

  const existing = priv.contractorInvoices ?? [];
  const entry = existing.find((e) => e.id === invoiceId);
  if (!entry) throw new Error("Invoice not found.");
  if (entry.status === "paid") {
    throw new Error("Invoice has already been paid.");
  }
  if (entry.status === "rejected") {
    throw new Error("Invoice was rejected — cannot pay.");
  }

  const stripe = getStripe();
  // Pre-flight: confirm the account is actually allowed to receive transfers.
  const account = await stripe.accounts.retrieve(accountId);
  if (!account.payouts_enabled) {
    throw new Error(
      "Contractor has not finished Stripe onboarding (payouts not enabled).",
    );
  }

  const transfer = await stripe.transfers.create({
    amount: entry.amount,
    currency: entry.currency,
    destination: accountId,
    description: entry.description,
    metadata: {
      clerkUserId: userId,
      contractorInvoiceId: entry.id,
    },
  });

  const updated = await updateContractorInvoice(userId, invoiceId, (e) => ({
    ...e,
    status: "paid",
    paidAt: Date.now(),
    transferId: transfer.id,
  }));

  return { invoice: updated, transfer };
}

export async function rejectContractorInvoice(
  userId: string,
  invoiceId: string,
  reason?: string,
): Promise<ContractorInvoice> {
  return updateContractorInvoice(userId, invoiceId, (e) => {
    if (e.status === "paid") {
      throw new Error("Cannot reject an already-paid invoice.");
    }
    return { ...e, status: "rejected", rejectionReason: reason };
  });
}
