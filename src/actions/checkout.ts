"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { checkoutSchema, type CheckoutInput } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/session";
import { readCart, setCouponCode } from "@/features/cart/server";
import { getPaymentProvider } from "@/lib/payments";
import { publicEnv } from "@/lib/config/public";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { errorCode, fail, logServerError, type ActionResult } from "@/lib/errors";
import { notifyOrderPlaced, notifyOrderStatus } from "@/features/orders/notifications";
import { toNumber } from "@/lib/utils/format";

type PlaceOrderResult = { order_id: string; order_number: string; total: number; currency: string; payment_method: "cod" | "online"; duplicate: boolean };

/**
 * Places the order. Prices, discounts, shipping and stock are recomputed and
 * locked inside place_order(); nothing priced by the browser is sent. The
 * idempotency key (issued when the checkout page rendered) makes double
 * submissions return the same order instead of creating a second one.
 */
export async function placeOrderAction(input: CheckoutInput): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Your session expired. Please sign in again." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const data = parsed.data;

  if (data.paymentMethod === "online" && !getPaymentProvider()) {
    return { ok: false, error: "Online payment is not available right now. Please choose another method." };
  }

  const entries = await readCart();
  if (entries.length === 0) return { ok: false, error: "Your cart is empty." };

  const supabase = await createClient();
  const { data: result, error } = await supabase.rpc("place_order", {
    p_payload: {
      idempotency_key: data.idempotencyKey,
      payment_method: data.paymentMethod,
      shipping_method: data.shippingMethod,
      coupon_code: data.couponCode ?? null,
      customer_note: data.note ?? null,
      contact: data.contact,
      address: {
        full_name: data.address.fullName,
        phone: data.address.phone,
        line1: data.address.line1,
        line2: data.address.line2 ?? "",
        city: data.address.city,
        state: data.address.state ?? "",
        postal_code: data.address.postalCode ?? "",
        country: data.address.country,
      },
      items: entries.map((e) => ({ variant_id: e.variantId, quantity: e.quantity })),
    },
  });
  if (error) {
    if (errorCode(error)?.startsWith("COUPON_")) await setCouponCode(null);
    return fail(error, "checkout.place_order");
  }
  const order = result as PlaceOrderResult;

  if (!order.duplicate) {
    if (data.saveAddress) {
      const { count } = await supabase.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      await supabase.from("addresses").insert({
        user_id: user.id,
        full_name: data.address.fullName,
        phone: data.address.phone,
        line1: data.address.line1,
        line2: data.address.line2 ?? null,
        city: data.address.city,
        state: data.address.state ?? null,
        postal_code: data.address.postalCode ?? null,
        country: data.address.country,
        is_default: (count ?? 0) === 0,
      });
    }
    await setCouponCode(null);
  }

  if (order.payment_method === "cod") {
    if (!order.duplicate) after(() => notifyOrderPlaced(order.order_id));
    redirect(`/checkout/success?order=${order.order_id}`);
  }

  const url = await startOnlinePayment(order.order_id, order.order_number, toNumber(order.total), order.currency, data.contact.email, `checkout-${order.order_id}`);
  redirect(url ?? `/account/orders/${order.order_id}?payment=error`);
}

/** Opens a gateway checkout session for an order and records it. Returns the redirect URL or null. */
async function startOnlinePayment(orderId: string, orderNumber: string, amount: number, currency: string, email: string, idempotencyKey: string) {
  const provider = getPaymentProvider();
  if (!provider || !isServiceRoleConfigured()) return null;
  try {
    const session = await provider.createCheckout({
      orderId,
      orderNumber,
      amount,
      currency,
      customerEmail: email,
      successUrl: `${publicEnv.siteUrl}/checkout/success?order=${orderId}`,
      cancelUrl: `${publicEnv.siteUrl}/account/orders/${orderId}?payment=cancelled`,
      idempotencyKey,
    });
    const { error } = await createAdminClient().rpc("attach_payment_session", {
      p_order_id: orderId,
      p_provider: provider.id,
      p_provider_ref: session.providerRef,
      p_checkout_url: session.url,
    });
    if (error) {
      logServerError("checkout.attach_session", error);
      return null;
    }
    return session.url;
  } catch (error) {
    logServerError("checkout.create_session", error);
    return null;
  }
}

/** Customer retries payment for their own unpaid online order. */
export async function retryPaymentAction(orderId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { ok: false, error: "Order not found." };

  // RLS: only the owner's order is visible.
  const supabase = await createClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, order_number, total, currency, email, status, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return fail(error, "checkout.retry_load");
  if (!order) return { ok: false, error: "Order not found." };
  if (order.payment_method !== "online" || order.status !== "pending" || !["pending", "failed"].includes(order.payment_status)) {
    return { ok: false, error: "This order does not need a payment." };
  }

  const url = await startOnlinePayment(
    order.id,
    order.order_number,
    toNumber(order.total),
    order.currency,
    order.email,
    `retry-${order.id}-${crypto.randomUUID()}`,
  );
  if (!url) return { ok: false, error: "We couldn't reach the payment provider. Please try again shortly." };
  redirect(url);
}

export async function cancelOrderAction(orderId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_order", { p_order_id: orderId, p_reason: "Cancelled by customer" });
  if (error) return fail(error, "checkout.cancel");
  after(() => notifyOrderStatus(orderId));
  refresh();
  return { ok: true, data: undefined, message: "Your order has been cancelled." };
}
