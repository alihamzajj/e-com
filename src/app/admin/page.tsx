import Link from "next/link";
import { Suspense } from "react";
import { requireStaff, profileHasPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { resolveRange } from "@/features/admin/date-range";
import { searchParam } from "@/features/admin/guard";
import { navFor } from "@/features/admin/nav";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { ReportSkeleton, ReportView } from "@/components/admin/report-view";
import { OrderStatusBadge, PaymentStatusBadge, SectionCard } from "@/components/admin/common";
import { Card, PageHeading, Skeleton } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/utils/format";
import type { StoreSettings } from "@/types/domain";

export const metadata = { title: "Dashboard" };

async function RecentOrders({ settings }: { settings: StoreSettings }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, placed_at, total, currency, status, payment_status")
    .order("placed_at", { ascending: false })
    .limit(8);
  const rows = (data ?? []) as {
    id: string; order_number: string; customer_name: string; placed_at: string; total: number; currency: string; status: string; payment_status: string;
  }[];
  return (
    <SectionCard title="Recent orders" actions={<Link href="/admin/orders" className="text-xs text-muted hover:text-ink">View all</Link>} bodyClassName="p-0">
      {rows.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">No orders yet.</p>
      ) : (
        <Table>
          <THead><tr><TH>Order</TH><TH>Customer</TH><TH>Placed</TH><TH>Payment</TH><TH>Status</TH><TH className="text-right">Total</TH></tr></THead>
          <tbody>
            {rows.map((o) => (
              <TR key={o.id}>
                <TD><Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.order_number}</Link></TD>
                <TD>{o.customer_name}</TD>
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
  );
}

async function Dashboard({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const profile = await requireStaff();
  const sp = await searchParams;
  const settings = await getStoreSettings();
  const denied = searchParam(sp, "denied");

  if (!profileHasPermission(profile, "reports")) {
    const sections = navFor(profile).filter((i) => i.key !== "dashboard");
    return (
      <div className="space-y-6">
        <PageHeading title={`Welcome${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} description="Choose a section to get started." />
        {denied ? <p role="alert" className="text-sm text-danger">You do not have the “{denied}” permission.</p> : null}
        {sections.length === 0 ? (
          <Card className="p-6 text-sm text-muted">No sections have been assigned to you yet. Ask an administrator for access.</Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s) => (
              <Link key={s.key} href={s.href}>
                <Card className="p-5 font-medium hover:border-line">{s.label}</Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const range = resolveRange(
    { range: searchParam(sp, "range"), from: searchParam(sp, "from"), to: searchParam(sp, "to") },
    settings.timezone,
  );

  return (
    <div className="space-y-6">
      <PageHeading title="Dashboard" description={`Store performance · ${range.label}`} />
      {denied ? <p role="alert" className="text-sm text-danger">You do not have the “{denied}” permission.</p> : null}
      <DateRangeFilter basePath="/admin" preset={range.preset} fromDate={range.fromDate} toDate={range.toDate} timezone={settings.timezone} />
      <Suspense key={`${range.from.toISOString()}-${range.to.toISOString()}`} fallback={<ReportSkeleton />}>
        <ReportView
          range={range}
          settings={settings}
          mode="overview"
          extra={
            profileHasPermission(profile, "orders") ? (
              <Suspense fallback={<Skeleton className="h-72" />}>
                <RecentOrders settings={settings} />
              </Suspense>
            ) : null
          }
        />
      </Suspense>
    </div>
  );
}

export default function AdminDashboardPage(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <Dashboard searchParams={props.searchParams} />
    </Suspense>
  );
}
