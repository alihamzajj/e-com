import { formatMoney, ORDER_STATUS_LABELS } from "@/lib/utils/format";
import type { Order, OrderItem, StoreSettings } from "@/types/domain";

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(settings: StoreSettings, heading: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#e9e9e6;font-family:Arial,Helvetica,sans-serif;color:#1b1b1c">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:10px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #e6e6e2;font-weight:800;letter-spacing:.08em">${escape(settings.storeName)}</td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 16px;font-size:20px">${escape(heading)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 28px;background:#f4f4f2;font-size:12px;color:#6f6f6c">
      ${settings.contactEmail ? `Questions? Reply to this email or write to ${escape(settings.contactEmail)}.` : ""}
    </td></tr>
  </table></td></tr></table></body></html>`;
}

export function orderConfirmationEmail(settings: StoreSettings, order: Order, items: OrderItem[], orderUrl: string) {
  const money = (v: number) => formatMoney(v, order.currency, settings.locale);
  const rows = items
    .map(
      (i) => `<tr><td style="padding:6px 0">${escape(i.product_name)}${i.variant_title && i.variant_title !== "Default" ? ` — ${escape(i.variant_title)}` : ""} × ${i.quantity}</td>
      <td style="padding:6px 0;text-align:right">${money(i.line_total)}</td></tr>`,
    )
    .join("");
  const payment =
    order.payment_method === "cod"
      ? "You will pay in cash when your order is delivered."
      : order.payment_status === "paid"
        ? "Your payment has been received."
        : "We will confirm your order as soon as the payment is verified.";
  const html = layout(
    settings,
    `Thanks for your order, ${order.customer_name.split(" ")[0]}`,
    `<p style="margin:0 0 16px">Order <strong>${escape(order.order_number)}</strong> has been received. ${payment}</p>
     <table role="presentation" width="100%" style="font-size:14px;border-top:1px solid #e6e6e2;border-bottom:1px solid #e6e6e2">${rows}</table>
     <table role="presentation" width="100%" style="font-size:14px;margin-top:12px">
       <tr><td>Subtotal</td><td style="text-align:right">${money(order.subtotal)}</td></tr>
       ${order.discount_total > 0 ? `<tr><td>Discount</td><td style="text-align:right">−${money(order.discount_total)}</td></tr>` : ""}
       <tr><td>Shipping</td><td style="text-align:right">${money(order.shipping_total)}</td></tr>
       <tr><td style="font-weight:700;padding-top:6px">Total</td><td style="text-align:right;font-weight:700;padding-top:6px">${money(order.total)}</td></tr>
     </table>
     <p style="margin:24px 0 0"><a href="${orderUrl}" style="display:inline-block;background:#ff5a1f;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">View your order</a></p>`,
  );
  const text = `Order ${order.order_number} received. Total ${money(order.total)}. ${payment} View: ${orderUrl}`;
  return { subject: `Order ${order.order_number} confirmed`, html, text };
}

export function orderStatusEmail(settings: StoreSettings, order: Order, orderUrl: string) {
  const label = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const extra =
    order.status === "shipped" && order.tracking_number
      ? `<p style="margin:0 0 16px">Tracking number: <strong>${escape(order.tracking_number)}</strong>${
          order.tracking_url ? ` — <a href="${escape(order.tracking_url)}">track your parcel</a>` : ""
        }</p>`
      : order.status === "cancelled" && order.cancelled_reason
        ? `<p style="margin:0 0 16px">Reason: ${escape(order.cancelled_reason)}</p>`
        : "";
  const html = layout(
    settings,
    `Your order is ${label.toLowerCase()}`,
    `<p style="margin:0 0 16px">Order <strong>${escape(order.order_number)}</strong> is now <strong>${escape(label)}</strong>.</p>${extra}
     <p style="margin:24px 0 0"><a href="${orderUrl}" style="color:#ff5a1f">View order details</a></p>`,
  );
  return { subject: `Order ${order.order_number}: ${label}`, html, text: `Order ${order.order_number} is now ${label}. ${orderUrl}` };
}

export function lowStockEmail(settings: StoreSettings, rows: { name: string; variant: string; sku: string; stock: number }[], adminUrl: string) {
  const list = rows
    .map((r) => `<li>${escape(r.name)} (${escape(r.variant)}, ${escape(r.sku)}): <strong>${r.stock} left</strong></li>`)
    .join("");
  const html = layout(settings, "Low stock alert", `<ul style="padding-left:18px">${list}</ul><p><a href="${adminUrl}">Open inventory</a></p>`);
  return {
    subject: `Low stock: ${rows.length} item${rows.length === 1 ? "" : "s"}`,
    html,
    text: rows.map((r) => `${r.name} (${r.sku}): ${r.stock} left`).join("\n"),
  };
}

export function questionAnsweredEmail(settings: StoreSettings, productName: string, question: string, answer: string, url: string) {
  const html = layout(
    settings,
    "Your question was answered",
    `<p style="margin:0 0 8px;color:#6f6f6c">${escape(productName)}</p>
     <p style="margin:0 0 8px"><strong>Q:</strong> ${escape(question)}</p>
     <p style="margin:0 0 16px"><strong>A:</strong> ${escape(answer)}</p>
     <p><a href="${url}" style="color:#ff5a1f">View on the product page</a></p>`,
  );
  return { subject: `Answer to your question about ${productName}`, html, text: `Q: ${question}\nA: ${answer}\n${url}` };
}
