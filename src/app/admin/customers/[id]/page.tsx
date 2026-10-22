import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requirePermission, profileHasPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { getStoreSettings } from "@/features/settings/queries";
import { FormSkeleton, KpiCard, OrderStatusBadge, PaymentStatusBadge, SectionCard } from "@/components/admin/common";
import { Badge, PageHeading } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatDateTime, formatMoney, toNumber } from "@/lib/utils/format";

export const metadata = { title: "Customer" };

type OrderRow = { id: string; order_number: string; placed_at: string; status: string; payment_status: string; total: number; refunded_total: number; currency: string };
type Support = { id: string; subject: string; status: string; created_at: string };

async function CustomerDetail({ params }: { params: PageProps<"/admin/customers/[id]">["params"] }) {
  const staff = await requirePermission("customers");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const settings = await getStoreSettings();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, phone, role, marketing_opt_in, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();
  const p = profile as { id: string; email: string | null; full_name: string | null; phone: string | null; role: string; marketing_opt_in: boolean; created_at: string };

  // Order history is part of the customers permission. Staff without the orders
  // permission cannot read orders through RLS, so after the permission check we
  // read only the summary columns needed here with the service role.
  const ordersClient = profileHasPermission(staff, "orders") || !isServiceRoleConfigured() ? supabase : createAdminClient();
  const [{ data: orders }, { data: support }] = await Promise.all([
    ordersClient
      .from("orders")
      .select("id, order_number, placed_at, status, payment_status, total, refunded_total, currency")
      .eq("user_id", id)
      .order("placed_at", { ascending: false })
      .limit(200),
    supabase.from("support_messages").select("id, subject, status, created_at").or(`user_id.eq.${id}${p.email ? `,email.eq."${p.email.replace(/"/g, "")}"` : ""}`).order("created_at", { ascending: false }).limit(50),
  ]);
  const list = (orders ?? []) as OrderRow[];
  const counted = list.filter((o) => o.status !== "cancelled");
  const spent = counted.reduce((s, o) => s + toNumber(o.total) - toNumber(o.refunded_total), 0);
  const dates = counted.map((o) => new Date(o.placed_at).getTime()).sort((a, b) => a - b);
  const avgGapDays = dates.length > 1 ? Math.round((dates[dates.length - 1] - dates[0]) / (dates.length - 1) / 86_400_000) : null;
  const canOpenOrders = profileHasPermission(staff, "orders");
  const money = (v: number) => formatMoney(v, settings.currency, settings.locale);

  return (
    <div className="space-y-5">
      <Link href="/admin/customers" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Customers
      </Link>
      <PageHeading
        title={p.full_name || p.email || "Customer"}
        description={`Customer since ${formatDate(p.created_at, settings.timezone)}`}
        actions={p.role !== "customer" ? <Badge tone="dark" className="capitalize">{p.role}</Badge> : null}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Orders" value={list.length} hint={`${list.length - counted.length} cancelled`} />
        <KpiCard label="Total spent" value={money(spent)} hint="Excludes cancelled, net of refunds" />
        <KpiCard label="Average order" value={counted.length ? money(spent / counted.length) : "—"} />
        <KpiCard
          label="Purchase frequency"
          value={avgGapDays === null ? "—" : `every ${avgGapDays} d`}
          hint={dates.length ? `First ${formatDate(new Date(dates[0]), settings.timezone)} · last ${formatDate(new Date(dates[dates.length - 1]), settings.timezone)}` : "No orders yet"}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <SectionCard title="Order history" bodyClassName="p-0">
          {list.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">No orders yet.</p>
          ) : (
            <Table>
              <THead><tr><TH>Order</TH><TH>Placed</TH><TH>Payment</TH><TH>Status</TH><TH className="text-right">Total</TH></tr></THead>
              <tbody>
                {list.map((o) => (
                  <TR key={o.id}>
                    <TD>{canOpenOrders ? <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link> : o.order_number}</TD>
                    <TD className="text-muted">{formatDateTime(o.placed_at, settings.timezone, settings.locale)}</TD>
                    <TD><PaymentStatusBadge status={o.payment_status} /></TD>
                    <TD><OrderStatusBadge status={o.status} /></TD>
                    <TD className="text-right tabular-nums">{formatMoney(o.total, o.currency, settings.locale)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </SectionCard>
        <div className="grid content-start gap-5">
          <SectionCard title="Contact">
            <dl className="grid gap-2 text-sm">
              <div><dt className="text-xs text-muted">Email</dt><dd className="break-all">{p.email ?? "—"}</dd></div>
              <div><dt className="text-xs text-muted">Phone</dt><dd>{p.phone || "—"}</dd></div>
              <div><dt className="text-xs text-muted">Marketing emails</dt><dd>{p.marketing_opt_in ? "Opted in" : "Not opted in"}</dd></div>
            </dl>
            <p className="mt-3 text-xs text-muted">Saved addresses stay private to the customer; each order keeps its own delivery address.</p>
          </SectionCard>
          <SectionCard title="Support messages" bodyClassName="p-0">
            {(support ?? []).length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No support messages.</p>
            ) : (
              <ul className="divide-y divide-line-soft text-sm">
                {((support ?? []) as Support[]).map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-2 px-5 py-3">
                    <Link href={`/admin/support/${m.id}`} className="hover:underline">
                      {m.subject}
                      <span className="block text-xs text-muted">{formatDate(m.created_at, settings.timezone)}</span>
                    </Link>
                    <Badge className="capitalize">{m.status}</Badge>
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

export default function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <CustomerDetail params={props.params} />
    </Suspense>
  );
}
