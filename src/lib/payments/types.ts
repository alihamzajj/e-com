// Gateway-agnostic payment interface. Add a provider by implementing this and
// registering it in ./index.ts — checkout, webhooks and refunds use only this.

export type CheckoutRequest = {
  orderId: string;
  orderNumber: string;
  amount: number; // major units, from the database
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  /** Stable key so a retried request never opens two sessions. */
  idempotencyKey: string;
};

export type CheckoutSession = { providerRef: string; url: string };

/** A verified gateway event, normalised. */
export type PaymentEvent = {
  eventId: string;
  eventType: string;
  orderId: string | null;
  providerRef: string | null;
  amount: number | null; // major units
  currency: string | null;
  outcome: "succeeded" | "failed" | "expired" | "ignored";
  failureReason?: string;
};

export type RefundRequest = { providerRef: string; amount: number; currency: string; idempotencyKey: string };

export interface PaymentProvider {
  readonly id: "stripe";
  readonly label: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Throws WebhookVerificationError when the signature is missing/invalid/stale. */
  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
  refund(request: RefundRequest): Promise<{ providerRef: string }>;
}

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookVerificationError";
  }
}

export class PaymentProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentProviderError";
  }
}
