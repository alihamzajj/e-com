"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { couponSchema } from "@/lib/validation/schemas";
import { fail, type ActionResult } from "@/lib/errors";
import { actionProfile, FORBIDDEN } from "@/features/admin/guard";
import { localDateTimeToUtc } from "@/features/admin/date-range";
import { getStoreSettings } from "@/features/settings/queries";

export async function saveCouponAction(couponId: string | null, input: unknown): Promise<ActionResult<{ id: string }>> {
  if (!(await actionProfile("coupons"))) return FORBIDDEN;
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please fix the form.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const c = parsed.data;
  const { timezone } = await getStoreSettings();
  const startsAt = c.startsAt ? localDateTimeToUtc(c.startsAt, timezone) : null;
  const endsAt = c.endsAt ? localDateTimeToUtc(c.endsAt, timezone) : null;
  if ((c.startsAt && !startsAt) || (c.endsAt && !endsAt)) return { ok: false, error: "Enter valid dates." };

  const row = {
    code: c.code,
    description: c.description ?? null,
    discount_type: c.discountType,
    value: c.value,
    max_discount: c.discountType === "percentage" ? (c.maxDiscount ?? null) : null,
    min_order_total: c.minOrderTotal,
    starts_at: startsAt?.toISOString() ?? null,
    ends_at: endsAt?.toISOString() ?? null,
    usage_limit: c.usageLimit ?? null,
    per_customer_limit: c.perCustomerLimit,
    is_active: c.isActive,
  };
  const supabase = await createClient();
  if (couponId) {
    const { error } = await supabase.from("coupons").update(row).eq("id", couponId);
    if (error) return fail(error, "admin.coupon.update");
    return { ok: true, data: { id: couponId }, message: "Coupon saved." };
  }
  const { data, error } = await supabase.from("coupons").insert(row).select("id").single();
  if (error) return fail(error, "admin.coupon.insert", error.code === "23505" ? "That code already exists." : undefined);
  return { ok: true, data: { id: (data as { id: string }).id }, message: "Coupon created." };
}

export async function toggleCouponAction(couponId: string, isActive: boolean): Promise<ActionResult> {
  if (!(await actionProfile("coupons"))) return FORBIDDEN;
  if (!z.uuid().safeParse(couponId).success) return { ok: false, error: "Invalid coupon." };
  const supabase = await createClient();
  const { error } = await supabase.from("coupons").update({ is_active: isActive }).eq("id", couponId);
  if (error) return fail(error, "admin.coupon.toggle");
  return { ok: true, data: undefined, message: isActive ? "Coupon activated." : "Coupon deactivated." };
}

export async function deleteCouponAction(couponId: string): Promise<ActionResult> {
  if (!(await actionProfile("coupons"))) return FORBIDDEN;
  if (!z.uuid().safeParse(couponId).success) return { ok: false, error: "Invalid coupon." };
  const supabase = await createClient();
  const [{ count }, { data: coupon }] = await Promise.all([
    supabase.from("coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", couponId),
    supabase.from("coupons").select("used_count").eq("id", couponId).maybeSingle(),
  ]);
  if ((count ?? 0) > 0 || ((coupon as { used_count: number } | null)?.used_count ?? 0) > 0) {
    return { ok: false, error: "This coupon has been used, so it is kept for order history. Deactivate it instead." };
  }
  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) return fail(error, "admin.coupon.delete");
  return { ok: true, data: undefined, message: "Coupon deleted." };
}
