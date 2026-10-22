export type CouponStateInput = {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  used_count: number;
};

export type CouponState = "inactive" | "expired" | "scheduled" | "used_up" | "active";

/** Display state of a coupon. The database re-checks eligibility at checkout. */
export function couponState(c: CouponStateInput, now: number = Date.now()): CouponState {
  if (!c.is_active) return "inactive";
  if (c.ends_at && new Date(c.ends_at).getTime() <= now) return "expired";
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return "scheduled";
  if (c.usage_limit !== null && c.used_count >= c.usage_limit) return "used_up";
  return "active";
}
