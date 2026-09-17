import "server-only";

import Stripe from "stripe";
import { env } from "@/lib/env";

let stripeClient: Stripe | undefined;

export function stripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      appInfo: { name: "Luke Baber Client Portal" },
      maxNetworkRetries: 2,
    });
  }
  return stripeClient;
}

let accountChecked: Promise<void> | undefined;

/**
 * Safety net: if STRIPE_EXPECTED_ACCOUNT is set, refuse to write to any other
 * Stripe account (e.g. a Cloud Slicer key pasted by mistake).
 */
export function assertStripeAccount() {
  const expected = process.env.STRIPE_EXPECTED_ACCOUNT;
  if (!expected) return Promise.resolve();
  accountChecked ??= stripe()
    .accounts.retrieveCurrent()
    .then((account) => {
      if (account.id !== expected) {
        accountChecked = undefined;
        throw new Error(
          `Stripe key belongs to ${account.id}, expected ${expected}. Refusing to continue.`,
        );
      }
    });
  return accountChecked;
}
