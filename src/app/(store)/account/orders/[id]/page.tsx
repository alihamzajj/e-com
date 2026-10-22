import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, ExternalLink, MessageSquareText, Star } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { getPaymentProvider } from "@/lib/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/products/product-image";
import { SummaryRows } from "@/components/cart/order-summary";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/account/order-badges";
import { CancelOrderButton, RetryPaymentButton } from "@/components/account/order-actions";
import { formatDateTime, formatMoney, ORDER_STATUS_LABELS, toNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { Order, OrderItem, OrderStatusEvent } from "@/types/domain";

export const metadata = { title: "Order details" };

type Props = PageProps<"/account/orders/[id]">;

export default function OrderDetailPage(props: Props) {
  return (
    <Suspense fallback={<div className="skeleton h-[480px] rounded-lg" aria-busy />}>
      <OrderDetail params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}

const FLOW = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

async function OrderDetail({ params, searchParams }: { params: Props["params"]; searchParams: Props["searchParams"] }) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  await requireUser(`/account/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // RLS limits every query below to the signed-in customer's own order.
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: history }, settings] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("id, product_id, variant_id, product_name, product_slug, variant_title, options, sku, image_url, unit_price, quantity, line_total").eq("order_id", id),
    supabase.from("order_status_history").select("id, from_status, to_status, note, created_at").eq("order_id", id).order("created_at"),
    getStoreSettings(),
  ]);
  if (!order) notFound();
  const o = order as Order;
  const lines = (items ?? []) as OrderItem[];
  const events = (history ?? []) as OrderStatusEvent[];
  const money = (v: number | string) => formatMoney(v, o.currency, settings.locale);
  const awaitingPayment = o.payment_method === "online" && o.status === "pending" && ["pending", "failed"].includes(o.payment_status);
  const canRetry = awaitingPayment && getPaymentProvider() !== null;
  const canCancel = o.status === "pending" && !["paid", "partially_refunded"].includes(o.payment_status);
  const reached = (s: string) => FLOW.indexOf(s as (typeof FLOW)[number]) <= FLOW.indexOf(o.status as (typeof FLOW)[number]);
  const a = o.shipping_address;

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>

      {sp.payment === "cancelled" && awaitingPayment ? (
        <p role="status" className="rounded-sm bg-warning-soft px-4 py-3 text-sm text-warning">
          Payment was not completed. Your items are reserved for a short time — you can try again below.
        </p>
      ) : null}
      {sp.payment === "error" ? (
        <p role="alert" className="rounded-sm bg-danger-soft px-4 py-3 text-sm text-danger">
          We couldn&apos;t open the payment page. Your order is saved — please try paying again.
        </p>
      ) : null}

      <Card className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h2 className="text-xl font-semibold">{o.order_number}</h2>
          <p className="text-sm text-muted">Placed {formatDateTime(o.placed_at, settings.timezone)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <OrderStatusBadge status={o.status} />
            <PaymentStatusBadge status={o.payment_status} method={o.payment_method} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRetry ? <RetryPaymentButton orderId={o.id} /> : null}
          {canCancel ? <CancelOrderButton orderId={o.id} /> : null}
          <Button asChild variant="ghost" size="sm">
            <Link href={`/contact?order=${encodeURIComponent(o.order_number)}`}>
              <MessageSquareText aria-hidden /> Get help
            </Link>
          </Button>
        </div>
      </Card>

      {o.status !== "cancelled" && o.status !== "returned" ? (
        <Card className="p-5">
          <ol className="grid grid-cols-5 gap-2" aria-label="Order progress">
            {FLOW.map((s) => (
              <li key={s} className="space-y-2">
                <span className={cn("block h-1.5 rounded-full", reached(s) ? "bg-accent" : "bg-line-soft")} />
                <span className={cn("flex items-center gap-1 text-xs", reached(s) ? "font-medium text-ink" : "text-subtle")}>
                  {reached(s) ? <Check className="size-3" aria-hidden /> : null}
                  {ORDER_STATUS_LABELS[s]}
                </span>
              </li>
            ))}
          </ol>
          {o.tracking_number ? (
            <p className="mt-4 text-sm">
              Tracking: <strong>{o.tracking_number}</strong>
              {o.tracking_url && /^https?:\/\//.test(o.tracking_url) ? (
                <a href={o.tracking_url} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-accent-strong hover:underline">
                  Track parcel <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </p>
          ) : null}
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-line-soft">
            {lines.map((i) => (
              <li key={i.id} className="flex items-center gap-4 px-5 py-4">
                <span className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-line-soft">
                  <ProductImage src={i.image_url} alt="" fill sizes="64px" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium">
                    {i.product_slug ? (
                      <Link href={`/products/${i.product_slug}`} className="hover:underline">
                        {i.product_name}
                      </Link>
                    ) : (
                      i.product_name
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {i.variant_title && i.variant_title !== "Default" ? `${i.variant_title} · ` : ""}SKU {i.sku} · {money(i.unit_price)} × {i.quantity}
                  </p>
                  {o.status === "delivered" && i.product_slug ? (
                    <Link href={`/products/${i.product_slug}#reviews`} className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent-strong hover:underline">
                      <Star className="size-3" aria-hidden /> Write a review
                    </Link>
                  ) : null}
                </div>
                <p className="font-semibold tabular-nums">{money(i.line_total)}</p>
              </li>
            ))}
          </ul>
          <CardContent className="border-t border-line-soft">
            <SummaryRows
              subtotal={toNumber(o.subtotal)}
              discount={toNumber(o.discount_total)}
              shipping={toNumber(o.shipping_total)}
              shippingLabel={o.shipping_method_label}
              total={toNumber(o.total)}
              currency={o.currency}
              locale={settings.locale}
              couponCode={o.coupon_code}
            />
            {toNumber(o.refunded_total) > 0 ? (
              <p className="mt-3 text-sm text-muted">Refunded: {money(o.refunded_total)}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-ink-soft">
              <address className="not-italic">
                <span className="font-medium text-ink">{a.full_name}</span>
                <br />
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {[a.city, a.state, a.postal_code].filter(Boolean).join(", ")} · {a.country}
                <br />
                {a.phone}
              </address>
              <p className="mt-3 text-xs text-muted">
                {o.payment_method === "cod" ? "Cash on delivery" : "Paid online"} · {o.shipping_method_label}
              </p>
              {o.customer_note ? <p className="mt-3 rounded-sm bg-surface px-3 py-2 text-xs">Note: {o.customer_note}</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {events.map((e) => (
                  <li key={e.id} className="relative border-l-2 border-line-soft pl-4 text-sm">
                    <span className="absolute top-1 -left-[5px] size-2 rounded-full bg-accent" aria-hidden />
                    <p className="font-medium">{ORDER_STATUS_LABELS[e.to_status] ?? e.to_status}</p>
                    {e.note ? <p className="text-xs text-ink-soft">{e.note}</p> : null}
                    <p className="text-xs text-muted">{formatDateTime(e.created_at, settings.timezone)}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
