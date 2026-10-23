import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { getPaymentProvider } from "@/lib/payments";
import { allowedNextStatuses } from "@/features/admin/orders";
import { FormSkeleton, OrderStatusBadge, PaymentStatusBadge, SectionCard } from "@/components/admin/common";
import { OrderActions, OrderNoteForm } from "@/components/admin/order-actions";
import { Badge, PageHeading } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatMoney, ORDER_STATUS_LABELS, toNumber } from "@/lib/utils/format";
import type { Order, OrderItem } from "@/types/domain";

export const metadata = { title: "Order" };

type Payment = { id: string; provider: string; kind: string; status: string; amount: number; currency: string; provider_ref: string | null; failure_reason: string | null; created_at: string; metadata: { reason?: string } };
type History = { id: string; from_status: string | null; to_status: string; note: string | null; created_at: string };
type Note = { id: string; body: string; created_at: string; author_id: string | null };
type EmailLog = { id: string; template: string; status: string; to_email: string; error: string | null; created_at: string };

async function OrderDetail({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  await requirePermission("orders");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const settings = await getStoreSettings();
  const supabase = await createClient();
  const [{ data: order }, { data: items }, { data: payments }, { data: history }, { data: notes }, { data: emails }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
    supabase.from("payments").select("*").eq("order_id", id).order("created_at"),
    supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
    supabase.from("order_notes").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("email_logs").select("id, template, status, to_email, error, created_at").eq("order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();
  const o = order as Order;
  const money = (v: number | string) => formatMoney(v, o.currency, settings.locale);
  const when = (v: string) => formatDateTime(v, settings.timezone, settings.locale);
  const a = o.shipping_address;
  const refundable = Math.max(0, toNumber(o.paid_total) - toNumber(o.refunded_total));
  const coupon = o.coupon_code;

  return (
    <div className="space-y-5">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Orders
      </Link>
      <PageHeading
        title={`Order ${o.order_number}`}
        description={`Placed ${when(o.placed_at)}`}
        actions={
          <>
            <PaymentStatusBadge status={o.payment_status} />
            <OrderStatusBadge status={o.status} />
          </>
        }
      />

      <SectionCard title="Actions">
        <OrderActions
          orderId={o.id}
          status={o.status}
          paymentMethod={o.payment_method}
          paymentStatus={o.payment_status}
          total={toNumber(o.total)}
          refundable={refundable}
          currency={o.currency}
          locale={settings.locale}
          nextStatuses={allowedNextStatuses(o.status, o.payment_method, o.payment_status)}
          hasGateway={getPaymentProvider() !== null}
        />
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid content-start gap-5">
          <SectionCard title="Items" bodyClassName="p-0">
            <Table className="min-w-0">
              <THead><tr><TH>Product</TH><TH>SKU</TH><TH className="text-right">Unit</TH><TH className="text-right">Qty</TH><TH className="text-right">Total</TH></tr></THead>
              <tbody>
                {((items ?? []) as OrderItem[]).map((i) => (
                  <TR key={i.id}>
                    <TD>
                      {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="font-medium hover:underline">{i.product_name}</Link> : <span className="font-medium">{i.product_name}</span>}
                      {i.variant_title && i.variant_title !== "Default" ? <span className="block text-xs text-muted">{i.variant_title}</span> : null}
                    </TD>
                    <TD className="font-mono text-xs">{i.sku}</TD>
                    <TD className="text-right tabular-nums">{money(i.unit_price)}</TD>
                    <TD className="text-right tabular-nums">{i.quantity}</TD>
                    <TD className="text-right tabular-nums">{money(i.line_total)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <dl className="grid gap-1.5 border-t border-line-soft px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{money(o.subtotal)}</dd></div>
              {toNumber(o.discount_total) > 0 ? (
                <div className="flex justify-between"><dt className="text-muted">Discount{coupon ? ` (${coupon})` : ""}</dt><dd className="tabular-nums">−{money(o.discount_total)}</dd></div>
              ) : null}
              <div className="flex justify-between"><dt className="text-muted">Shipping · {o.shipping_method_label}</dt><dd className="tabular-nums">{money(o.shipping_total)}</dd></div>
              <div className="flex justify-between font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(o.total)}</dd></div>
              <div className="flex justify-between text-muted"><dt>Paid</dt><dd className="tabular-nums">{money(o.paid_total)}</dd></div>
              {toNumber(o.refunded_total) > 0 ? (
                <div className="flex justify-between text-danger"><dt>Refunded</dt><dd className="tabular-nums">−{money(o.refunded_total)}</dd></div>
              ) : null}
            </dl>
          </SectionCard>

          <SectionCard title="Payments" bodyClassName="p-0">
            {(payments ?? []).length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">
                {o.payment_method === "cod" ? "Cash on delivery — no payment recorded yet." : "No payment attempts yet."}
              </p>
            ) : (
              <Table className="min-w-0">
                <THead><tr><TH>When</TH><TH>Type</TH><TH>Provider</TH><TH>Status</TH><TH>Reference</TH><TH className="text-right">Amount</TH></tr></THead>
                <tbody>
                  {((payments ?? []) as Payment[]).map((p) => (
                    <TR key={p.id}>
                      <TD className="text-xs text-muted">{when(p.created_at)}</TD>
                      <TD className="capitalize">{p.kind}{p.metadata?.reason ? <span className="block text-xs normal-case text-muted">{p.metadata.reason}</span> : null}</TD>
                      <TD className="uppercase text-xs">{p.provider}</TD>
                      <TD>
                        <Badge tone={p.status === "succeeded" ? "success" : p.status === "failed" ? "danger" : p.status === "pending" ? "warning" : "neutral"}>{p.status}</Badge>
                        {p.failure_reason ? <span className="block text-xs text-muted">{p.failure_reason}</span> : null}
                      </TD>
                      <TD className="max-w-40 truncate font-mono text-xs" title={p.provider_ref ?? ""}>{p.provider_ref ?? "—"}</TD>
                      <TD className={`text-right tabular-nums ${p.kind === "refund" ? "text-danger" : ""}`}>{p.kind === "refund" ? "−" : ""}{money(p.amount)}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </SectionCard>

          <SectionCard title="Status history">
            <ol className="relative grid gap-4 border-l border-line pl-5">
              {((history ?? []) as History[]).map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-ink ring-4 ring-card" aria-hidden />
                  <p className="text-sm font-medium">{ORDER_STATUS_LABELS[h.to_status] ?? h.to_status}</p>
                  <p className="text-xs text-muted">{when(h.created_at)}</p>
                  {h.note ? <p className="mt-1 text-sm text-ink-soft">{h.note}</p> : null}
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>

        <div className="grid content-start gap-5">
          <SectionCard title="Customer">
            <dl className="grid gap-2 text-sm">
              <div><dt className="text-xs text-muted">Name</dt><dd>{o.customer_name}</dd></div>
              <div><dt className="text-xs text-muted">Email</dt><dd className="break-all"><a href={`mailto:${o.email}`} className="hover:underline">{o.email}</a></dd></div>
              <div><dt className="text-xs text-muted">Phone</dt><dd><a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a></dd></div>
              {o.user_id ? <div><Link href={`/admin/customers/${o.user_id}`} className="text-xs text-muted hover:text-ink">View customer →</Link></div> : null}
            </dl>
          </SectionCard>
          <SectionCard title="Shipping">
            <address className="text-sm not-italic leading-relaxed">
              {a.full_name}<br />
              {a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />
              {[a.city, a.state, a.postal_code].filter(Boolean).join(", ")}<br />
              {a.country}<br />
              {a.phone}
            </address>
            <p className="mt-3 text-sm"><span className="text-muted">Method:</span> {o.shipping_method_label}</p>
            {o.tracking_number ? (
              <p className="mt-1 text-sm">
                <span className="text-muted">Tracking:</span>{" "}
                {o.tracking_url ? <a href={o.tracking_url} target="_blank" rel="noreferrer" className="underline">{o.tracking_number}</a> : o.tracking_number}
              </p>
            ) : null}
            <p className="mt-1 text-sm"><span className="text-muted">Payment:</span> {o.payment_method === "cod" ? "Cash on delivery" : "Online"}</p>
            {o.customer_note ? <p className="mt-3 rounded-sm bg-surface p-3 text-sm"><span className="block text-xs text-muted">Customer note</span>{o.customer_note}</p> : null}
            {o.cancelled_reason ? <p className="mt-3 text-sm text-danger">Cancelled: {o.cancelled_reason}</p> : null}
          </SectionCard>
          <SectionCard title="Internal notes">
            <OrderNoteForm orderId={o.id} />
            <ul className="mt-4 grid gap-3">
              {((notes ?? []) as Note[]).map((n) => (
                <li key={n.id} className="rounded-sm bg-surface p-3 text-sm">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{when(n.created_at)}</p>
                </li>
              ))}
            </ul>
          </SectionCard>
          <SectionCard title="Emails" bodyClassName="p-0">
            {(emails ?? []).length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No emails sent for this order.</p>
            ) : (
              <ul className="divide-y divide-line-soft text-sm">
                {((emails ?? []) as EmailLog[]).map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <span>
                      <span className="block">{e.template.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted">{when(e.created_at)}{e.error ? ` · ${e.error}` : ""}</span>
                    </span>
                    <Badge tone={e.status === "sent" ? "success" : e.status === "failed" ? "danger" : "neutral"}>{e.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <OrderDetail params={props.params} />
    </Suspense>
  );
}
