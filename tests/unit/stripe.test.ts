import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fromMinorUnits, normaliseStripeEvent, toMinorUnits, verifyStripeSignature } from "@/lib/payments/stripe";
import { WebhookVerificationError } from "@/lib/payments/types";

const SECRET = "whsec_test_secret";
const NOW = 1_760_000_000;

function sign(body: string, timestamp = NOW, secret = SECRET) {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

const completed = JSON.stringify({
  id: "evt_1",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_test_1",
      payment_status: "paid",
      amount_total: 2850000,
      currency: "pkr",
      client_reference_id: "order-uuid",
      metadata: { order_id: "order-uuid" },
    },
  },
});

describe("Stripe webhook signature verification", () => {
  it("accepts a correctly signed, fresh payload", () => {
    const event = verifyStripeSignature(completed, sign(completed), SECRET, NOW + 10);
    expect(event.id).toBe("evt_1");
  });

  it("rejects a tampered body", () => {
    const header = sign(completed);
    const tampered = completed.replace("2850000", "100");
    expect(() => verifyStripeSignature(tampered, header, SECRET, NOW)).toThrow(WebhookVerificationError);
  });

  it("rejects a payload signed with another secret", () => {
    expect(() => verifyStripeSignature(completed, sign(completed, NOW, "whsec_other"), SECRET, NOW)).toThrow(/Invalid signature/);
  });

  it("rejects replays outside the tolerance window", () => {
    expect(() => verifyStripeSignature(completed, sign(completed, NOW - 600), SECRET, NOW)).toThrow(/Stale/);
  });

  it("rejects missing and malformed headers", () => {
    expect(() => verifyStripeSignature(completed, null, SECRET, NOW)).toThrow(/Missing/);
    expect(() => verifyStripeSignature(completed, "v1=abc", SECRET, NOW)).toThrow(/Malformed/);
  });

  it("accepts when any of several v1 signatures matches (secret rotation)", () => {
    const good = sign(completed).split(",")[1];
    const header = `t=${NOW},v1=${"0".repeat(64)},${good}`;
    expect(verifyStripeSignature(completed, header, SECRET, NOW).id).toBe("evt_1");
  });
});

describe("Stripe event normalisation", () => {
  it("maps a paid checkout session to a succeeded payment in major units", () => {
    const e = normaliseStripeEvent(JSON.parse(completed));
    expect(e).toMatchObject({
      eventId: "evt_1",
      outcome: "succeeded",
      orderId: "order-uuid",
      providerRef: "cs_test_1",
      amount: 28500,
      currency: "PKR",
    });
  });

  it("does not treat an unpaid completed session as paid", () => {
    const raw = JSON.parse(completed);
    raw.data.object.payment_status = "unpaid";
    expect(normaliseStripeEvent(raw).outcome).toBe("ignored");
  });

  it("maps expiry, async success/failure and ignores other events", () => {
    const base = JSON.parse(completed);
    expect(normaliseStripeEvent({ ...base, type: "checkout.session.expired" }).outcome).toBe("expired");
    expect(normaliseStripeEvent({ ...base, type: "checkout.session.async_payment_succeeded" }).outcome).toBe("succeeded");
    expect(normaliseStripeEvent({ ...base, type: "checkout.session.async_payment_failed" }).outcome).toBe("failed");
    expect(normaliseStripeEvent({ ...base, type: "customer.created" }).outcome).toBe("ignored");
  });

  it("converts minor units by currency exponent", () => {
    expect(toMinorUnits(28500, "PKR")).toBe(2850000);
    expect(toMinorUnits(10.1, "USD")).toBe(1010);
    expect(toMinorUnits(500, "JPY")).toBe(500);
    expect(fromMinorUnits(1010, "usd")).toBe(10.1);
  });
});
