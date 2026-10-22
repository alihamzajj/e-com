import { NextResponse, after } from "next/server";
import { getPaymentProviderById, WebhookVerificationError } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { logServerError } from "@/lib/errors";
import { notifyOrderPlaced } from "@/features/orders/notifications";

/**
 * Payment gateway webhook. The signature is verified before anything else;
 * record_gateway_payment() then applies the event exactly once (event ids are
 * stored, so replays and retries are no-ops) and checks the amount against the
 * order total held in the database.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/webhooks/[provider]">) {
  const { provider: providerId } = await ctx.params;
  const provider = getPaymentProviderById(providerId);
  if (!provider) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const rawBody = await request.text();
  let event;
  try {
    event = await provider.verifyWebhook(rawBody, request.headers);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
    logServerError("webhook.verify", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }

  if (event.outcome === "ignored" || !event.orderId) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const { data, error } = await createAdminClient().rpc("record_gateway_payment", {
    p_provider: provider.id,
    p_event_id: event.eventId,
    p_event_type: event.eventType,
    p_order_id: event.orderId,
    p_provider_ref: event.providerRef,
    p_amount: event.amount,
    p_currency: event.currency,
    p_outcome: event.outcome,
    p_failure_reason: event.failureReason ?? null,
  });
  if (error) {
    // 500 makes the gateway retry later; the event id was not stored because the
    // transaction rolled back.
    logServerError("webhook.record", error);
    return NextResponse.json({ error: "Could not record event" }, { status: 500 });
  }

  if (data === "paid") {
    const orderId = event.orderId;
    after(() => notifyOrderPlaced(orderId));
  }
  return NextResponse.json({ received: true, result: data });
}
