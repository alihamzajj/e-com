import type { OrderStatus } from "@/types/domain";

// Mirror of public.order_transition_allowed(); the database is authoritative.
export const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export const ORDER_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "partially_refunded", "refunded"] as const;

export function allowedNextStatuses(
  current: OrderStatus,
  paymentMethod: "cod" | "online",
  paymentStatus: string,
): OrderStatus[] {
  const paid = paymentStatus === "paid" || paymentStatus === "partially_refunded";
  return NEXT_STATUSES[current].filter(
    (s) => paymentMethod === "cod" || paid || !["confirmed", "processing", "shipped", "delivered"].includes(s),
  );
}
