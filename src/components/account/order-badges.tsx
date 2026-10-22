import { Badge } from "@/components/ui/primitives";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/utils/format";

const STATUS_TONE = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "neutral",
} as const;

const PAYMENT_TONE = {
  unpaid: "neutral",
  pending: "warning",
  paid: "success",
  failed: "danger",
  partially_refunded: "warning",
  refunded: "neutral",
} as const;

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status as keyof typeof STATUS_TONE] ?? "neutral"}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

export function PaymentStatusBadge({ status, method }: { status: string; method?: string }) {
  const label = method === "cod" && status === "unpaid" ? "Pay on delivery" : PAYMENT_STATUS_LABELS[status] ?? status;
  return <Badge tone={PAYMENT_TONE[status as keyof typeof PAYMENT_TONE] ?? "neutral"}>{label}</Badge>;
}
