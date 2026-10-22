"use server";

import { after } from "next/server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { getPaymentProviderById, PaymentProviderError } from "@/lib/payments";
import { orderStatusSchema, refundSchema } from "@/lib/validation/schemas";
import { fail, logServerError, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";
import { notifyOrderStatus } from "@/features/orders/notifications";
import { toNumber } from "@/lib/utils/format";

export async function updateOrderStatusAction(input: unknown): Promise<ActionResult> {
  if (!(await actionProfile("orders"))) return FORBIDDEN;
  const parsed = orderStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid status change." };
  const { orderId, status, note, trackingNumber, trackingUrl } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_order_status", {
    p_order_id: orderId,
    p_status: status,
    p_note: note ?? null,
    p_tracking_number: trackingNumber ?? null,
    p_tracking_url: trackingUrl ?? null,
  });
  if (error) return fail(error, "admin.order.status");
  if (status === "cancelled" || status === "returned") updateTag("products"); // stock went back up
  after(() => notifyOrderStatus(orderId));
  return { ok: true, data: undefined, message: `Order marked ${status}.` };
}

export async function recordCodPaymentAction(orderId: string, amount: number): Promise<ActionResult> {
  if (!(await actionProfile("orders"))) return FORBIDDEN;
  const parsed = z.object({ orderId: z.uuid(), amount: z.number().positive() }).safeParse({ orderId, amount });
  if (!parsed.success) return { ok: false, error: "Invalid amount." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_record_cod_payment", { p_order_id: orderId, p_amount: amount });
  if (error) return fail(error, "admin.order.cod");
  return { ok: true, data: undefined, message: "Cash payment recorded." };
}

export async function recordRefundAction(input: unknown): Promise<ActionResult> {
  const profile = await actionProfile("orders");
  if (!profile) return FORBIDDEN;
  const parsed = refundSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid refund." };
  const { orderId, amount, reason } = parsed.data;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, payment_method, paid_total, refunded_total, currency")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  const o = order as { payment_method: "cod" | "online"; paid_total: number; refunded_total: number; currency: string };
  const refundable = toNumber(o.paid_total) - toNumber(o.refunded_total);
  if (amount > refundable + 1e-9) return { ok: false, error: "The refund amount is more than what can be refunded." };

  if (o.payment_method === "cod") {
    const { error } = await supabase.rpc("admin_record_manual_refund", { p_order_id: orderId, p_amount: amount, p_reason: reason });
    if (error) return fail(error, "admin.order.refund.manual");
    return { ok: true, data: undefined, message: "Refund recorded." };
  }

  // Online: the gateway issues the refund first; we record it only after it confirms.
  const { data: charge } = await supabase
    .from("payments")
    .select("provider, provider_ref")
    .eq("order_id", orderId)
    .eq("kind", "charge")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const c = charge as { provider: string; provider_ref: string | null } | null;
  if (!c?.provider_ref) return { ok: false, error: "No verified gateway payment was found for this order." };
  const provider = getPaymentProviderById(c.provider);
  if (!provider) return { ok: false, error: "The payment gateway for this order is not configured on the server." };
  if (!isServiceRoleConfigured()) return { ok: false, error: "Server is missing SUPABASE_SECRET_KEY; refunds cannot be recorded." };

  let refundRef: string;
  try {
    const refund = await provider.refund({
      providerRef: c.provider_ref,
      amount,
      currency: o.currency,
      idempotencyKey: `refund-${orderId}-${amount}-${Date.now()}`,
    });
    refundRef = refund.providerRef;
  } catch (error) {
    logServerError("admin.order.refund.gateway", error);
    return {
      ok: false,
      error: error instanceof PaymentProviderError ? `The gateway rejected the refund: ${error.message}` : "The refund could not be issued.",
    };
  }

  const { error } = await createAdminClient().rpc("record_gateway_refund", {
    p_order_id: orderId,
    p_amount: amount,
    p_reason: reason,
    p_provider: provider.id,
    p_provider_ref: refundRef,
    p_actor: profile.id,
  });
  if (error) {
    logServerError("admin.order.refund.record", error);
    return { ok: false, error: `The gateway refunded the payment (ref ${refundRef}) but it could not be recorded. Record it again or contact support.` };
  }
  return { ok: true, data: undefined, message: "Refund issued through the gateway and recorded." };
}

export async function addOrderNoteAction(orderId: string, body: string): Promise<ActionResult> {
  if (!(await actionProfile("orders"))) return FORBIDDEN;
  const parsed = z.object({ orderId: z.uuid(), body: z.string().trim().min(1, "Write a note.").max(2000) }).safeParse({ orderId, body });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid note." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_order_note", { p_order_id: orderId, p_body: parsed.data.body });
  if (error) return fail(error, "admin.order.note");
  return { ok: true, data: undefined, message: "Note added." };
}
