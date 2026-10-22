import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getStoreSettings } from "@/features/settings/queries";
import { CouponForm } from "@/components/admin/coupon-form";
import { FormSkeleton } from "@/components/admin/common";
import { PageHeading } from "@/components/ui/primitives";

export const metadata = { title: "New coupon" };

async function NewCoupon() {
  await requirePermission("coupons");
  const settings = await getStoreSettings();
  return (
    <div className="max-w-3xl space-y-5">
      <Link href="/admin/coupons" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="size-4" /> Coupons
      </Link>
      <PageHeading title="New coupon" />
      <CouponForm
        couponId={null}
        currency={settings.currency}
        timezone={settings.timezone}
        initial={{ code: "", description: "", discountType: "percentage", value: "", maxDiscount: "", minOrderTotal: 0, startsAt: "", endsAt: "", usageLimit: "", perCustomerLimit: 1, isActive: true }}
      />
    </div>
  );
}

export default function NewCouponPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <NewCoupon />
    </Suspense>
  );
}
