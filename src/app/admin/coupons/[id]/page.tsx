import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getStoreSettings } from "@/features/settings/queries";
import { utcToLocalInput } from "@/features/admin/date-range";
import { CouponForm } from "@/components/admin/coupon-form";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { FormSkeleton, SectionCard } from "@/components/admin/common";
import { PageHeading } from "@/components/ui/primitives";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { deleteCouponAction } from "@/actions/admin/coupons";
import { formatDateTime, formatMoney } from "@/lib/utils/format";

export const metadata = { title: "Edit coupon" };

type Coupon = {
  id: string; code: string; description: string | null; discount_type: "percentage" | "fixed"; value: number; max_discount: number | null;
  min_order_total: number; starts_at: string | null; ends_at: string | null; usage_limit: number | null; per_customer_limit: number;
  used_count: number; is_active: boolean;
};

async function EditCoupon({ params }: { params: PageProps<"/admin/coupons/[id]">["params"] }) {
  await requirePermission("coupons");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const settings = await getStoreSettings();
  const supabase = await createClient();
  const [{ data }, { data: redemptions }] = await Promise.all([
    supabase.from("coupons").select("*").eq("id", id).maybeSingle(),
    supabase.from("coupon_redemptions").select("id, amount, created_at, order_id").eq("coupon_id", id).order("created_at", { ascending: false }).limit(50),
  ]);
  if (!data) notFound();
  const c = data as Coupon;
  const s = (v: number | null) => (v === null ? "" : String(v));

  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/coupons" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Coupons
      </Link>
      <PageHeading
        title={c.code}
        description={`Used ${c.used_count}${c.usage_limit ? ` of ${c.usage_limit}` : ""} times`}
        actions={
          <ConfirmButton title="Delete coupon?" description="Only coupons that were never used can be deleted." confirmLabel="Delete" action={() => deleteCouponAction(c.id)} redirectTo="/admin/coupons">
            Delete
          </ConfirmButton>
        }
      />
      <CouponForm
        couponId={c.id}
        currency={settings.currency}
        timezone={settings.timezone}
        initial={{
          code: c.code,
          description: c.description ?? "",
          discountType: c.discount_type,
          value: String(c.value),
          maxDiscount: s(c.max_discount),
          minOrderTotal: String(c.min_order_total),
          startsAt: utcToLocalInput(c.starts_at, settings.timezone),
          endsAt: utcToLocalInput(c.ends_at, settings.timezone),
          usageLimit: s(c.usage_limit),
          perCustomerLimit: c.per_customer_limit,
          isActive: c.is_active,
        }}
      />
      <SectionCard title="Redemptions" bodyClassName="p-0">
        {(redemptions ?? []).length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted">Not used yet.</p>
        ) : (
          <Table className="min-w-0">
            <THead><tr><TH>When</TH><TH>Order</TH><TH className="text-right">Discount</TH></tr></THead>
            <tbody>
              {((redemptions ?? []) as { id: string; amount: number; created_at: string; order_id: string }[]).map((r) => (
                <TR key={r.id}>
                  <TD className="text-muted">{formatDateTime(r.created_at, settings.timezone, settings.locale)}</TD>
                  <TD><Link href={`/admin/orders/${r.order_id}`} className="hover:underline">View order</Link></TD>
                  <TD className="text-right tabular-nums">{formatMoney(r.amount, settings.currency, settings.locale)}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}

export default function EditCouponPage(props: PageProps<"/admin/coupons/[id]">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditCoupon params={props.params} />
    </Suspense>
  );
}
