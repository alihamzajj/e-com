// Stripe Checkout adapter using the HTTP API directly (no SDK dependency).
// https://docs.stripe.com/api/checkout/sessions  https://docs.stripe.com/webhooks#verify-manually
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  PaymentProviderError,
  WebhookVerificationError,
  type CheckoutRequest,
  type PaymentEvent,
  type PaymentProvider,
  type RefundRequest,
} from "./types";

const API = "https://api.stripe.com/v1";
const SIGNATURE_TOLERANCE_SECONDS = 300;

// https://docs.stripe.com/currencies#zero-decimal
const ZERO_DECIMAL = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

export function toMinorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
}

export function fromMinorUnits(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? amount : amount / 100;
}

/** Verifies a Stripe-Signature header. Returns the parsed event on success. */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Record<string, unknown> {
  if (!header) throw new WebhookVerificationError("Missing Stripe-Signature header");
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const timestamp = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    throw new WebhookVerificationError("Malformed Stripe-Signature header");
  }
  if (Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new WebhookVerificationError("Stale webhook timestamp");
  }
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest();
  const valid = signatures.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!valid) throw new WebhookVerificationError("Invalid signature");
  try {
    return JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    throw new WebhookVerificationError("Invalid JSON payload");
  }
}

type StripeSession = {
  id: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  client_reference_id?: string | null;
  metadata?: Record<string, string>;
};

export function normaliseStripeEvent(event: Record<string, unknown>): PaymentEvent {
  const type = String(event.type ?? "");
  const id = String(event.id ?? "");
  const session = ((event.data as { object?: StripeSession })?.object ?? {}) as StripeSession;
  const currency = session.currency ? session.currency.toUpperCase() : null;
  const base = {
    eventId: id,
    eventType: type,
    orderId: session.metadata?.order_id ?? session.client_reference_id ?? null,
    providerRef: session.id ?? null,
    amount: typeof session.amount_total === "number" && currency ? fromMinorUnits(session.amount_total, currency) : null,
    currency,
  };
  switch (type) {
    case "checkout.session.completed":
      // Card payments are "paid" here; delayed methods arrive via async_payment_succeeded.
      return { ...base, outcome: session.payment_status === "paid" ? "succeeded" : "ignored" };
    case "checkout.session.async_payment_succeeded":
      return { ...base, outcome: "succeeded" };
    case "checkout.session.async_payment_failed":
      return { ...base, outcome: "failed", failureReason: "Payment failed" };
    case "checkout.session.expired":
      return { ...base, outcome: "expired" };
    default:
      return { ...base, outcome: "ignored" };
  }
}

function form(data: Record<string, string | number>) {
  return new URLSearchParams(Object.entries(data).map(([k, v]) => [k, String(v)])).toString();
}

export function createStripeProvider(secretKey: string, webhookSecret: string): PaymentProvider {
  async function call<T>(path: string, body: Record<string, string | number>, idempotencyKey: string): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idempotencyKey,
      },
      body: form(body),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
    if (!res.ok) throw new PaymentProviderError(json.error?.message ?? `Stripe HTTP ${res.status}`);
    return json;
  }

  return {
    id: "stripe",
    label: "Card (Stripe)",
    async createCheckout(req: CheckoutRequest) {
      const session = await call<{ id: string; url: string }>(
        "/checkout/sessions",
        {
          mode: "payment",
          success_url: req.successUrl,
          cancel_url: req.cancelUrl,
          customer_email: req.customerEmail,
          client_reference_id: req.orderId,
          "metadata[order_id]": req.orderId,
          "metadata[order_number]": req.orderNumber,
          "payment_intent_data[metadata][order_id]": req.orderId,
          "line_items[0][quantity]": 1,
          "line_items[0][price_data][currency]": req.currency.toLowerCase(),
          "line_items[0][price_data][unit_amount]": toMinorUnits(req.amount, req.currency),
          "line_items[0][price_data][product_data][name]": `Order ${req.orderNumber}`,
          // Stripe's minimum is 30 minutes; unpaid orders are released when it expires.
          expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        },
        req.idempotencyKey,
      );
      if (!session.url) throw new PaymentProviderError("Stripe did not return a checkout URL");
      return { providerRef: session.id, url: session.url };
    },
    async verifyWebhook(rawBody, headers) {
      const event = verifyStripeSignature(rawBody, headers.get("stripe-signature"), webhookSecret);
      return normaliseStripeEvent(event);
    },
    async refund(req: RefundRequest) {
      const session = await fetch(`${API}/checkout/sessions/${encodeURIComponent(req.providerRef)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
        signal: AbortSignal.timeout(15_000),
      }).then((r) => r.json() as Promise<{ payment_intent?: string }>);
      if (!session.payment_intent) throw new PaymentProviderError("No payment found for this checkout session");
      const refund = await call<{ id: string; status: string }>(
        "/refunds",
        { payment_intent: session.payment_intent, amount: toMinorUnits(req.amount, req.currency) },
        req.idempotencyKey,
      );
      if (refund.status === "failed" || refund.status === "canceled") {
        throw new PaymentProviderError(`Refund ${refund.status}`);
      }
      return { providerRef: refund.id };
    },
  };
}
