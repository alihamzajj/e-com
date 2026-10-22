import Link from "next/link";
import { Suspense } from "react";
import { ShoppingBag } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { buildHref, pageParam, safeSearch, searchParam } from "@/features/admin/guard";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/features/admin/orders";
import { resolveRange } from "@/features/admin/date-range";
import { FilterBar, FilterField, filterInput, OrderStatusBadge, PaymentStatusBadge, TableSkeleton } from "@/components/admin/common";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui/primitives";
import { Pagination } from "@/components/ui/pagination";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatMoney, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils/format";

export const metadata = { title: "Orders" };
const PAGE_SIZE = 25;

type Row = {
  id: string; order_number: string; customer_name: string; email: string; placed_at: string; total: number; currency: string;
  status: string; payment_status: string; payment_method: string; shipping_method_label: string; shipping_address: { city?: string };
};

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  await requirePermission("orders");
  const sp = await searchParams;
  const settings = await getStoreSettings();
  const supabase = await createClient();

  const q = safeSearch(searchParam(sp, "q"));
  const status = searchParam(sp, "status");
  const payment = searchParam(sp, "payment");
  const method = searchParam(sp, "method");
  const from = searchParam(sp, "from");
  const to = searchParam(sp, "to");
  const page = pageParam(sp);

  let query = supabase
    .from("orders")
    .select("id, order_number, customer_name, email, placed_at, total, currency, status, payment_status, payment_method, shipping_method_label, shipping_address", { count: "exact" })
    .order("placed_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.or(`order_number.ilike.%${q}%,email.ilike.%${q}%,customer_name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (status && (ORDER_STATUSES as string[]).includes(status)) query = query.eq("status", status);
  if (payment && (PAYMENT_STATUSES as readonly string[]).includes(payment)) query = query.eq("payment_status", payment);
  if (method === "cod" || method === "online") query = query.eq("payment_method", method);
  if (from || to) {
    const range = resolveRange({ range: "custom", from: from ?? to, to: to ?? from }, settings.timezone);
    query = query.gte("placed_at", range.from.toISOString()).lt("placed_at", range.to.toISOString());
  }

  const { data, count, error } = await query;
  const rows = (data ?? []) as Row[];
  const total = count ?? 0;
  const current = { q, status, payment, method, from, to };

  return (
    <div className="space-y-5">
      <PageHeading title="Orders" description={`${total} order${total === 1 ? "" : "s"}`} />
      <FilterBar action="/admin/orders">
        <FilterField label="Search" className="min-w-48 flex-1">
          <input name="q" defaultValue={q} placeholder="Order #, email, name, phone" className={filterInput} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ""} className={filterInput}>
            <option value="">All</option>
            {ORDER_STATUSES.map((s) => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
          </select>
        </FilterField>
        <FilterField label="Payment">
          <select name="payment" defaultValue={payment ?? ""} className={filterInput}>
            <option value="">All</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABELS[s]}</option>)}
          </select>
        </FilterField>
        <FilterField label="Method">
          <select name="method" defaultValue={method ?? ""} className={filterInput}>
            <option value="">All</option>
            <option value="cod">Cash on delivery</option>
            <option value="online">Online</option>
          </select>
        </FilterField>
        <FilterField label="From"><input type="date" name="from" defaultValue={from} className={filterInput} /></FilterField>
        <FilterField label="To"><input type="date" name="to" defaultValue={to} className={filterInput} /></FilterField>
      </FilterBar>

      {error ? (
        <Card role="alert" className="p-6 text-sm text-danger">Orders could not be loaded.</Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={<ShoppingBag />} title={Object.values(current).some(Boolean) ? "No orders match these filters" : "No orders yet"} /></Card>
      ) : (
        <Card>
          <Table>
            <THead>
              <tr><TH>Order</TH><TH>Customer</TH><TH>Placed</TH><TH>Payment</TH><TH>Fulfilment</TH><TH>Shipping</TH><TH className="text-right">Total</TH></tr>
            </THead>
            <tbody>
              {rows.map((o) => (
                <TR key={o.id}>
                  <TD><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></TD>
                  <TD>
                    <span className="block">{o.customer_name}</span>
                    <span className="text-xs text-muted">{o.email}</span>
                  </TD>
                  <TD className="whitespace-nowrap text-muted">{formatDateTime(o.placed_at, settings.timezone, settings.locale)}</TD>
                  <TD>
                    <div className="flex flex-wrap items-center gap-1">
                      <PaymentStatusBadge status={o.payment_status} />
                      <Badge>{o.payment_method === "cod" ? "COD" : "Online"}</Badge>
                    </div>
                  </TD>
                  <TD><OrderStatusBadge status={o.status} /></TD>
                  <TD className="text-muted">
                    {o.shipping_method_label}
                    {o.shipping_address?.city ? <span className="block text-xs">{o.shipping_address.city}</span> : null}
                  </TD>
                  <TD className="text-right tabular-nums">{formatMoney(o.total, o.currency, settings.locale)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
      <Pagination page={page} pageCount={Math.ceil(total / PAGE_SIZE)} hrefFor={(n) => buildHref("/admin/orders", current, { page: n })} />
    </div>
  );
}

export default function OrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Orders searchParams={props.searchParams} />
    </Suspense>
  );
}
