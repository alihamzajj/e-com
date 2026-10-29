import Link from "next/link";
import { Suspense } from "react";
import type * as React from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Flag, FolderTree, LifeBuoy, MessageSquareText, PackageCheck, Plus, ShoppingBag, Truck } from "lucide-react";
import { requireStaff, profileHasPermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { resolveRange } from "@/features/admin/date-range";
import { searchParam } from "@/features/admin/guard";
import { navFor } from "@/features/admin/nav";
import { getAttentionCounts } from "@/features/admin/attention";
import { DateRangeFilter } from "@/components/admin/date-range-filter";
import { ReportSkeleton, ReportView } from "@/components/admin/report-view";
import { clickableRow, OrderStatusBadge, PaymentStatusBadge, rowLink, SectionCard } from "@/components/admin/common";
import { Button } from "@/components/ui/button";
import { Card, PageHeading, Skeleton } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDateTime, formatMoney } from "@/lib/utils/format";
import type { Profile, StoreSettings } from "@/types/domain";

export const metadata = { title: "Dashboard" };

type Task = { key: string; count: number | null; label: string; href: string; icon: React.ComponentType<{ className?: string }>; urgent?: boolean };

async function NeedsAttention({ profile }: { profile: Profile }) {
  const c = await getAttentionCounts(profile);
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  const tasks: Task[] = [
    { key: "confirm", count: c.toConfirm, label: plural(c.toConfirm ?? 0, "new order to confirm", "new orders to confirm"), href: "/admin/orders?status=pending", icon: ShoppingBag, urgent: true },
    { key: "ship", count: c.toShip, label: plural(c.toShip ?? 0, "order to pack & ship", "orders to pack & ship"), href: "/admin/orders?status=to_ship", icon: Truck, urgent: true },
    { key: "stock", count: c.lowStock, label: plural(c.lowStock ?? 0, "product low or out of stock", "products low or out of stock"), href: "/admin/products?stock=low", icon: AlertTriangle },
    { key: "uncategorised", count: c.uncategorised, label: plural(c.uncategorised ?? 0, "product with no category (hidden from shop sections)", "products with no category (hidden from shop sections)"), href: "/admin/products?category=none", icon: FolderTree },
    { key: "questions", count: c.questions, label: plural(c.questions ?? 0, "customer question to answer", "customer questions to answer"), href: "/admin/questions", icon: MessageSquareText },
    { key: "reports", count: c.reports, label: plural(c.reports ?? 0, "reported review or question", "reported reviews or questions"), href: "/admin/questions?tab=reports", icon: Flag },
    { key: "support", count: c.support, label: plural(c.support ?? 0, "new message", "new messages"), href: "/admin/support", icon: LifeBuoy },
  ];
  const allowed = tasks.filter((t) => t.count !== null);
  if (allowed.length === 0) return null;
  const open = allowed.filter((t) => (t.count ?? 0) > 0);

  return (
    <SectionCard title="Needs your attention" description="Click a task to jump straight to it.">
      {open.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CheckCircle2 className="size-4 text-success" /> All caught up — nothing is waiting for you.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {open.map((t) => (
            <li key={t.key}>
              <Link
                href={t.href}
                className="flex h-full items-center gap-3 rounded-md border border-line-soft px-4 py-3 transition-colors hover:border-ink/30 hover:bg-surface"
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-full ${t.urgent ? "bg-accent-soft text-accent-strong" : "bg-surface text-ink-soft"}`}>
                  <t.icon className="size-4" />
                </span>
                <span className="min-w-0 text-sm">
                  <span className="block text-lg font-semibold tabular-nums leading-tight text-ink">{t.count}</span>
                  <span className="text-ink-soft">{t.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function QuickActions({ profile }: { profile: Profile }) {
  return (
    <>
      {profileHasPermission(profile, "products") ? (
        <Button asChild size="sm"><Link href="/admin/products/new"><Plus /> Add product</Link></Button>
      ) : null}
      {profileHasPermission(profile, "orders") ? (
        <Button asChild size="sm" variant="outline"><Link href="/admin/orders"><PackageCheck /> Orders</Link></Button>
      ) : null}
      <Button asChild size="sm" variant="outline"><Link href="/" target="_blank"><ExternalLink /> View store</Link></Button>
    </>
  );
}

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
              <TR key={o.id} className={clickableRow}>
                <TD><Link href={`/admin/orders/${o.id}`} className={`font-medium hover:underline ${rowLink}`}>{o.order_number}</Link></TD>
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
        <PageHeading title={`Welcome${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`} description="Choose a section to get started." actions={<QuickActions profile={profile} />} />
        {denied ? <p role="alert" className="text-sm text-danger">You do not have the “{denied}” permission.</p> : null}
        <Suspense fallback={<Skeleton className="h-28" />}>
          <NeedsAttention profile={profile} />
        </Suspense>
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
      <PageHeading
        title={`Welcome back${profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description={`Store performance · ${range.label}`}
        actions={<QuickActions profile={profile} />}
      />
      {denied ? <p role="alert" className="text-sm text-danger">You do not have the “{denied}” permission.</p> : null}
      <Suspense fallback={<Skeleton className="h-28" />}>
        <NeedsAttention profile={profile} />
      </Suspense>
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
