import "server-only";
import { serverEnv } from "@/lib/config/server";
import { createStripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

/**
 * The configured online payment gateway, or null when online payments are not
 * set up. PAYMENT_PROVIDER selects the adapter; its secrets come from env.
 */
export function getPaymentProvider(): PaymentProvider | null {
  switch (serverEnv.paymentProvider) {
    case "stripe":
      if (!serverEnv.stripeSecretKey || !serverEnv.stripeWebhookSecret) return null;
      return createStripeProvider(serverEnv.stripeSecretKey, serverEnv.stripeWebhookSecret);
    default:
      return null;
  }
}

export function getPaymentProviderById(id: string): PaymentProvider | null {
  const provider = getPaymentProvider();
  return provider && provider.id === id ? provider : null;
}

export * from "./types";
