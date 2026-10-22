import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { publicEnv } from "@/lib/config/public";
import { sendEmail } from "@/lib/email/send";
import { lowStockEmail, orderConfirmationEmail, orderStatusEmail } from "@/lib/email/templates";
import { getStoreSettings } from "@/features/settings/queries";
import { logServerError } from "@/lib/errors";
import { toNumber } from "@/lib/utils/format";
import type { Order, OrderItem } from "@/types/domain";

const NOTIFY_STATUSES = new Set(["confirmed", "shipped", "delivered", "cancelled", "returned"]);

function normaliseOrder(row: Record<string, unknown>): Order {
  const o = row as unknown as Order;
  return {
    ...o,
    subtotal: toNumber(o.subtotal),
    discount_total: toNumber(o.discount_total),
    shipping_total: toNumber(o.shipping_total),
    tax_total: toNumber(o.tax_total),
    total: toNumber(o.total),
    paid_total: toNumber(o.paid_total),
    refunded_total: toNumber(o.refunded_total),
  };
}

/**
 * Order confirmation (COD orders right after placement; online orders once the
 * payment is verified) followed by a low-stock check for the purchased items.
 * Runs after the response is sent; failures are logged, never thrown.
 */
export async function notifyOrderPlaced(orderId: string) {
  if (!isServiceRoleConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
    const { data: items } = await admin.from("order_items").select("*").eq("order_id", orderId);
    if (!order) return;
    const settings = await getStoreSettings();
    const o = normaliseOrder(order);
    const lines = ((items ?? []) as OrderItem[]).map((i) => ({ ...i, line_total: toNumber(i.line_total) }));
    const mail = orderConfirmationEmail(settings, o, lines, `${publicEnv.siteUrl}/account/orders/${o.id}`);
    await sendEmail({ to: o.email, ...mail, template: "order_confirmation", orderId: o.id });
    await checkLowStock(lines.map((l) => l.variant_id).filter(Boolean) as string[]);
  } catch (error) {
    logServerError("notify.order_placed", error);
  }
}

export async function notifyOrderStatus(orderId: string) {
  if (!isServiceRoleConfigured()) return;
  try {
    const admin = createAdminClient();
    const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
    if (!order || !NOTIFY_STATUSES.has(order.status)) return;
    const settings = await getStoreSettings();
    const o = normaliseOrder(order);
    const mail = orderStatusEmail(settings, o, `${publicEnv.siteUrl}/account/orders/${o.id}`);
    await sendEmail({ to: o.email, ...mail, template: `order_${o.status}`, orderId: o.id });
  } catch (error) {
    logServerError("notify.order_status", error);
  }
}

async function checkLowStock(variantIds: string[]) {
  const settings = await getStoreSettings();
  if (!settings.lowStockAlertEmail || variantIds.length === 0) return;
  const { data } = await createAdminClient()
    .from("product_variants")
    .select("sku, title, stock_quantity, products!inner(name, low_stock_threshold)")
    .in("id", variantIds);
  type Row = { sku: string; title: string; stock_quantity: number; products: { name: string; low_stock_threshold: number } };
  const low = ((data ?? []) as unknown as Row[])
    .filter((r) => r.stock_quantity <= r.products.low_stock_threshold)
    .map((r) => ({ name: r.products.name, variant: r.title, sku: r.sku, stock: r.stock_quantity }));
  if (low.length === 0) return;
  const mail = lowStockEmail(settings, low, `${publicEnv.siteUrl}/admin/products?stock=low`);
  await sendEmail({ to: settings.lowStockAlertEmail, ...mail, template: "low_stock" });
}
