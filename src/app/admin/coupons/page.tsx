import Link from "next/link";
import { Suspense } from "react";
import { Plus, TicketPercent } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { TableSkeleton } from "@/components/admin/common";
import { CouponToggle } from "@/components/admin/coupon-form";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeading } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { couponState } from "@/features/admin/coupons";

export const metadata = { title: "Coupons" };

type Coupon = {
  id: string; code: string; description: string | null; discount_type: string; value: number; max_discount: number | null;
  min_order_total: number; starts_at: string | null; ends_at: string | null; usage_limit: number | null; used_count: number; is_active: boolean;
};

async function Coupons() {
  await requirePermission("coupons");
  const settings = await getStoreSettings();
  const supabase = await createClient();
  const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as Coupon[];
  const money = (v: number) => formatMoney(v, settings.currency, settings.locale);
  const state = (c: Coupon) => {
    const s = couponState(c);
    if (s === "inactive") return <Badge>Inactive</Badge>;
    if (s === "expired") return <Badge tone="danger">Expired</Badge>;
    if (s === "scheduled") return <Badge tone="info">Scheduled</Badge>;
    if (s === "used_up") return <Badge tone="warning">Used up</Badge>;
    return <Badge tone="success">Active</Badge>;
  };

  return (
    <div className="space-y-5">
      <PageHeading
        title="Coupons"
        description="Eligibility, limits and dates are checked on the server at checkout."
        actions={<Button asChild><Link href="/admin/coupons/new"><Plus /> New coupon</Link></Button>}
      />
      {error ? (
        <Card role="alert" className="p-6 text-sm text-danger">Coupons could not be loaded.</Card>
      ) : rows.length === 0 ? (
        <Card><EmptyState icon={<TicketPercent />} title="No coupons yet" /></Card>
      ) : (
        <Card>
          <Table>
            <THead><tr><TH>Code</TH><TH>Discount</TH><TH>Minimum</TH><TH>Valid</TH><TH className="text-right">Used</TH><TH>Status</TH><TH /></tr></THead>
            <tbody>
              {rows.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link href={`/admin/coupons/${c.id}`} className="font-mono font-medium hover:underline">{c.code}</Link>
                    {c.description ? <span className="block text-xs text-muted">{c.description}</span> : null}
                  </TD>
                  <TD>
                    {c.discount_type === "percentage" ? `${Number(c.value)}%` : money(c.value)}
                    {c.max_discount ? <span className="block text-xs text-muted">max {money(c.max_discount)}</span> : null}
                  </TD>
                  <TD className="text-muted">{Number(c.min_order_total) > 0 ? money(c.min_order_total) : "—"}</TD>
                  <TD className="text-xs text-muted">
                    {c.starts_at ? formatDate(c.starts_at, settings.timezone) : "Now"} → {c.ends_at ? formatDate(c.ends_at, settings.timezone) : "No end"}
                  </TD>
                  <TD className="text-right tabular-nums">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</TD>
                  <TD>{state(c)}</TD>
                  <TD className="text-right"><CouponToggle couponId={c.id} isActive={c.is_active} /></TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
    </div>
  );
}

export default function CouponsPage() {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <Coupons />
    </Suspense>
  );
}
